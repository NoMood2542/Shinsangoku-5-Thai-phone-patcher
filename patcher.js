// ---- OfficialThai v0.9 embedded package ----
const PACKAGE_ZIP_SHA='1c65d5dcd2a132265482c4182aa94e85f10e6ddc66e90e47bbbab0cc0b953d58';
let packageFile=null;
const EXPECTED={isoSize:1792507904,isoSha:'686475bda60781574762220e71c930da4b1b31210e9d7d5dfe1e4b423595aa09'};
const INTERNAL={
 'L00B':'/PSP_GAME/USRDIR/LINKDATA00_T.BIN','L00I':'/PSP_GAME/USRDIR/LINKDATA00_T.IDX',
 'L01B':'/PSP_GAME/USRDIR/LINKDATA01_T.BIN','L01I':'/PSP_GAME/USRDIR/LINKDATA01_T.IDX',
 'EBOOT':'/PSP_GAME/SYSDIR/EBOOT.BIN'
};
const emit=(cb,p,stage,detail)=>cb?.({percent:Math.max(0,Math.min(100,Math.round(p))),stage,detail});
function b64bytes(s){const raw=atob(s),o=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)o[i]=raw.charCodeAt(i);return o;}
let assetPromise;
async function loadAssets(){
 if(assetPromise)return assetPromise;
 if(!packageFile)throw new Error('กรุณาเลือก THAI100 v0.9.0 payload ZIP ก่อน');
 assetPromise=(async()=>{
  const ab=await packageFile.arrayBuffer(),zbytes=new Uint8Array(ab);
  if(hashBytes(zbytes)!==PACKAGE_ZIP_SHA)throw new Error('payload ZIP SHA-256 ไม่ตรง v0.9.0 ที่รองรับ');
  const zip=await JSZip.loadAsync(ab);
  const mn=Object.keys(zip.files).find(n=>n.endsWith('/PAYLOAD_MANIFEST.json')||n==='PAYLOAD_MANIFEST.json');
  if(!mn)throw new Error('PAYLOAD_MANIFEST.json missing');
  const root=mn.slice(0,-'PAYLOAD_MANIFEST.json'.length),manifest=JSON.parse(await zip.file(mn).async('text'));
  if(manifest?.schema!=='THAI100_OFFICIALTHAI_FULL_CAUSAL_REGRESSION_PAYLOAD_V1')throw new Error('v0.9 manifest schema mismatch');
  return {zip,root,manifest};
 })();
 return assetPromise;
}
async function assetBytes(assets,path,spec){
 const f=assets.zip.file(assets.root+path);if(!f)throw new Error('payload missing: '+path);
 const b=await f.async('uint8array');
 if(spec?.size!==undefined&&b.length!==+spec.size)throw new Error('payload size mismatch: '+path);
 if(spec?.sha256&&hashBytes(b)!==spec.sha256)throw new Error('payload SHA-256 mismatch: '+path);
 return b;
}
function parseSm4l(index){
 if(index.length<16||String.fromCharCode(...index.slice(0,4))!=='SM4L')throw new Error('IDX is not SM4L');
 const c=u32le(index,4);if(index.length!==16+c*16)throw new Error('SM4L size/count mismatch');
 const rows=[];for(let i=0;i<c;i++)rows.push([u32le(index,16+i*16),u32le(index,20+i*16),u32le(index,24+i*16),u32le(index,28+i*16)]);return rows;
}
function writeSm4l(index,i,vals){const dv=new DataView(index.buffer,index.byteOffset,index.byteLength);for(let j=0;j<4;j++)dv.setUint32(16+i*16+j*4,vals[j]>>>0,true);}
function patchedBlob(base,patches,appendParts=[]){
 patches=[...patches].sort((a,b)=>a.start-b.start||a.end-b.end);for(let i=1;i<patches.length;i++)if(patches[i].start<patches[i-1].end)throw new Error('patch overlap @ '+patches[i].start);
 const parts=[];let cur=0;for(const p of patches){if(p.start>cur)parts.push(base.slice(cur,p.start));parts.push(p.data instanceof Blob?p.data:new Blob([p.data]));cur=p.end;}if(cur<base.size)parts.push(base.slice(cur));parts.push(...appendParts);return new Blob(parts,{type:'application/octet-stream'});
}
async function rebuildArchiveLbaSafe(container,sourceIso,binEntry,idxBytes,assets,onProgress){
 const src=parseSm4l(idxBytes),outi=new Uint8Array(idxBytes),specs=assets.manifest.records[container],baseStart=binEntry.extent*S;
 const allocSectors=Math.ceil(binEntry.size/S),base=sourceIso.slice(baseStart,baseStart+allocSectors*S),patches=[],appendParts=[];let appendSec=allocSectors;
 const ids=Object.keys(specs).map(Number).sort((a,b)=>a-b),inplace=[],appended=[],modified={};
 for(let n=0;n<ids.length;n++){const i=ids[n],spec=specs[String(i)];if(i<0||i>=src.length)throw new Error(`record out of range ${container}:${i}`);
  const [oldsec,span,oldsize,flags]=src[i],data=await assetBytes(assets,spec.file,spec),need=Math.ceil(data.length/S);
  if(need<=span){const start=oldsec*S,cap=span*S,pad=cap-data.length;patches.push({start,end:start+cap,data:new Blob([data,pad?new Uint8Array(pad):new Uint8Array(0)])});writeSm4l(outi,i,[oldsec,span,data.length,flags]);inplace.push(i);}
  else{const sec=appendSec,pad=need*S-data.length;appendParts.push(new Blob([data,pad?new Uint8Array(pad):new Uint8Array(0)]));appendSec+=need;writeSm4l(outi,i,[sec,need,data.length,flags]);appended.push(i);}
  modified[i]=spec.sha256;if((n&7)===0||n+1===ids.length){onProgress?.((n+1)/ids.length,`LINKDATA${container} ${n+1}/${ids.length}`);await new Promise(r=>setTimeout(r,0));}
 }
 const bin=patchedBlob(base,patches,appendParts);return {bin,idx:outi,modified,audit:{inplace,appended,source_bytes:binEntry.size,output_bytes:bin.size}};
}
function dirPatch(entry,newExtent,newSize){const b=new Uint8Array(16),dv=new DataView(b.buffer);dv.setUint32(0,newExtent>>>0,true);dv.setUint32(4,newExtent>>>0,false);dv.setUint32(8,newSize>>>0,true);dv.setUint32(12,newSize>>>0,false);return {start:entry.recordOffset+2,end:entry.recordOffset+18,data:b};}
function volPatch(offset,sectors){const b=new Uint8Array(8),dv=new DataView(b.buffer);dv.setUint32(0,sectors>>>0,true);dv.setUint32(4,sectors>>>0,false);return {start:offset+80,end:offset+88,data:b};}
async function buildIsoLbaSafe(source,layout,replacements){
 let tailSector=Math.ceil(source.size/S);const patches=[],appendParts=[],actions=[];
 for(const r of replacements){const e=r.entry,size=r.size,oldAlloc=Math.ceil(e.size/S),newAlloc=Math.ceil(size/S),blob=r.data instanceof Blob?r.data:new Blob([r.data]);let newExtent,mode;
  if(newAlloc<=oldAlloc){const pad=oldAlloc*S-size;patches.push({start:e.extent*S,end:e.extent*S+oldAlloc*S,data:new Blob([blob,pad?new Uint8Array(pad):new Uint8Array(0)])});newExtent=e.extent;mode='IN_PLACE';}
  else{newExtent=tailSector;const pad=newAlloc*S-size;appendParts.push(new Blob([blob,pad?new Uint8Array(pad):new Uint8Array(0)]));tailSector+=newAlloc;mode='APPEND_RELOCATE';}
  patches.push(dirPatch(e,newExtent,size));actions.push({path:e.path,old_extent:e.extent,new_extent:newExtent,old_size:e.size,new_size:size,mode});
 }
 for(const d of layout.descriptorOffsets)patches.push(volPatch(d,tailSector));
 const originalPadded=source.size===Math.ceil(source.size/S)*S?source:new Blob([source,new Uint8Array(Math.ceil(source.size/S)*S-source.size)]);
 const out=patchedBlob(originalPadded,patches,appendParts);if(out.size!==tailSector*S)throw new Error('final ISO size mismatch');return {iso:new Blob([out],{type:'application/x-iso9660-image'}),actions};
}
async function verifyLbaDrift(before,after,changedPaths){
 for(const [path,e] of before.entries){const oe=after.entries.get(path);if(!oe)throw new Error('output missing ISO entry: '+path);if(e.isDirectory&&oe.extent!==e.extent)throw new Error('directory LBA drift: '+path);if(!e.isDirectory&&!changedPaths.has(path)&&oe.extent!==e.extent)throw new Error('unmodified file LBA drift: '+path);}
}
async function patchOfficialThai(sourceIso,onProgress){
 if(!sourceIso.name.toLowerCase().endsWith('.iso'))throw new Error('เลือกไฟล์ .ISO เท่านั้น');
 if(sourceIso.size!==EXPECTED.isoSize)throw new Error(`ISO ขนาดไม่ตรง clean official CN (${sourceIso.size.toLocaleString()} bytes)`);
 emit(onProgress,1,'ตรวจ clean CN','SHA-256 1.79 GB แบบ chunked');const srcHash=await hashBlob(sourceIso,f=>emit(onProgress,1+f*19,'ตรวจ clean CN',`${Math.round(f*100)}%`));if(srcHash!==EXPECTED.isoSha)throw new Error('FAIL-CLOSED: full ISO SHA-256 ไม่ตรง official CN ที่รองรับ');
 emit(onProgress,21,'อ่าน ISO','parse ISO9660');const layout=await parseIso9660(sourceIso);
 emit(onProgress,23,'โหลด v0.9 payload','ตรวจ embedded package + manifest');const assets=await loadAssets();
 const e00b=getIsoEntry(layout,INTERNAL.L00B),e00i=getIsoEntry(layout,INTERNAL.L00I),e01b=getIsoEntry(layout,INTERNAL.L01B),e01i=getIsoEntry(layout,INTERNAL.L01I),eeb=getIsoEntry(layout,INTERNAL.EBOOT);
 const idx00=new Uint8Array(await isoEntryBlob(sourceIso,e00i).arrayBuffer()),idx01=new Uint8Array(await isoEntryBlob(sourceIso,e01i).arrayBuffer());
 emit(onProgress,27,'สร้าง LINKDATA00_T','63 stage records + causal repairs');const o00=await rebuildArchiveLbaSafe('00',sourceIso,e00b,idx00,assets,(f,d)=>emit(onProgress,27+f*18,'สร้าง LINKDATA00_T',d));
 emit(onProgress,45,'สร้าง LINKDATA01_T','known-good G3 layer');const o01=await rebuildArchiveLbaSafe('01',sourceIso,e01b,idx01,assets,(f,d)=>emit(onProgress,45+f*10,'สร้าง LINKDATA01_T',d));
 emit(onProgress,55,'โหลด EBOOT Thai','ตรวจ SHA-256');const eSpec=assets.manifest.eboot,eboot=await assetBytes(assets,eSpec.file,eSpec);if(!(eboot[0]===0x7f&&eboot[1]===0x45&&eboot[2]===0x4c&&eboot[3]===0x46))throw new Error('EBOOT payload is not ELF');
 emit(onProgress,57,'ตรวจ payload outputs','hash LINKDATA + IDX');const built={L00B:await hashBlob(o00.bin,f=>emit(onProgress,57+f*5,'ตรวจ payload outputs','LINKDATA00_T.BIN')),L00I:hashBytes(o00.idx),L01B:await hashBlob(o01.bin,f=>emit(onProgress,62+f*3,'ตรวจ payload outputs','LINKDATA01_T.BIN')),L01I:hashBytes(o01.idx),EBOOT:eSpec.sha256};
 emit(onProgress,65,'ประกอบ ISO','LBA-safe: ไม่ขยับไฟล์/โฟลเดอร์ที่ไม่เกี่ยว');const builtIso=await buildIsoLbaSafe(sourceIso,layout,[{entry:e00b,data:o00.bin,size:o00.bin.size},{entry:e00i,data:o00.idx,size:o00.idx.length},{entry:e01b,data:o01.bin,size:o01.bin.size},{entry:e01i,data:o01.idx,size:o01.idx.length},{entry:eeb,data:eboot,size:eboot.length}]);
 const rebuilt=builtIso.iso;emit(onProgress,69,'ตรวจ ISO ที่สร้าง','re-open + 5 internal hashes + LBA audit');const outLayout=await parseIso9660(rebuilt),checks=[['L00B',INTERNAL.L00B],['L00I',INTERNAL.L00I],['L01B',INTERNAL.L01B],['L01I',INTERNAL.L01I],['EBOOT',INTERNAL.EBOOT]];
 const finalHashes={};for(let i=0;i<checks.length;i++){const [k,p]=checks[i],h=await hashBlob(isoEntryBlob(rebuilt,getIsoEntry(outLayout,p)),f=>emit(onProgress,69+((i+f)/checks.length)*14,'ตรวจ ISO ที่สร้าง',`${k} ${i+1}/5`));finalHashes[k]=h;if(h!==built[k])throw new Error(`FAIL-CLOSED output mismatch ${k}`);}
 await verifyLbaDrift(layout,outLayout,new Set(Object.values(INTERNAL).map(x=>x.toUpperCase())));
 emit(onProgress,84,'คำนวณ output SHA-256','สำหรับ BUILD_REPORT');const outHash=await hashBlob(rebuilt,f=>emit(onProgress,84+f*15,'คำนวณ output SHA-256',`${Math.round(f*100)}%`));
 emit(onProgress,100,'STATIC PASS','พร้อมบันทึกและเทส PPSSPP');const base=sourceIso.name.replace(/\.iso$/i,'');
 const strategy={stage_records:63,rec29_child4_runtime_confirmation:'PASS',rec29_r8_s1_runtime_confirmation:'PASS',rec29_r8_s1_payload_bytes:76,rec29_r8_s1_official_max_payload_bytes:80};
 const report={schema:'THAI100_OFFICIALTHAI_FULL_CAUSAL_REGRESSION_BUILD_V1_IPHONE',status:'STATIC_BUILD_PASS__PPSSPP_REQUIRED',candidate_id:'FULL_CAUSAL_REGRESSION',description:'G3 + all 63 Thai stage records with strategy child4 envelope guard + runtime-confirmed REC29 R8/S1 envelope repair',source_iso_sha256:srcHash,output_size:rebuilt.size,output_sha256:outHash,modified_records:{'00':Object.keys(o00.modified).map(Number).sort((a,b)=>a-b),'01':Object.keys(o01.modified).map(Number).sort((a,b)=>a-b)},strategy_gate:strategy,archive_audit:{'00':o00.audit,'01':o01.audit},iso_actions:builtIso.actions,internal_hashes:built,runtime_flow:'Boot -> Menu -> Character Select -> Cutscene -> Battle Preparation -> Start Battle -> Gameplay',verdict_rule:{PASS:'Both known REC29 causal repairs survive the full 63-stage regression path.',HANG_BATTLE_PREP:'A further independent stage/record defect remains; preserve both confirmed repairs and isolate the next divergence.',CRASH:'Capture new PC/RA; preserve both confirmed repairs.'},builder:'iPhone Safari GitHub-only v0.9.2'};
 return {iso:rebuilt,fileName:`${base}_THAI_OFFICIALTHAI_FULL_CAUSAL_v0.9.0.iso`,report};
}
