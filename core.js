// Self-contained SHA-256 + ZIP reader: no CDN imports, so iOS file selection still works offline.
const _K=new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
const _rotr=(x,n)=>(x>>>n)|(x<<(32-n));
class Sha256Inc{
 constructor(){this.h=new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);this.buf=new Uint8Array(64);this.blen=0;this.total=0;this.w=new Uint32Array(64);}
 _block(b,o=0){const w=this.w;for(let i=0;i<16;i++){const j=o+i*4;w[i]=((b[j]<<24)|(b[j+1]<<16)|(b[j+2]<<8)|b[j+3])>>>0;}for(let i=16;i<64;i++){const x=w[i-15],y=w[i-2],s0=(_rotr(x,7)^_rotr(x,18)^(x>>>3))>>>0,s1=(_rotr(y,17)^_rotr(y,19)^(y>>>10))>>>0;w[i]=(w[i-16]+s0+w[i-7]+s1)>>>0;}let[a,bv,c,d,e,f,g,h]=this.h;for(let i=0;i<64;i++){const S1=(_rotr(e,6)^_rotr(e,11)^_rotr(e,25))>>>0,ch=((e&f)^(~e&g))>>>0,t1=(h+S1+ch+_K[i]+w[i])>>>0,S0=(_rotr(a,2)^_rotr(a,13)^_rotr(a,22))>>>0,maj=((a&bv)^(a&c)^(bv&c))>>>0,t2=(S0+maj)>>>0;h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=bv;bv=a;a=(t1+t2)>>>0;}const q=this.h;q[0]=(q[0]+a)>>>0;q[1]=(q[1]+bv)>>>0;q[2]=(q[2]+c)>>>0;q[3]=(q[3]+d)>>>0;q[4]=(q[4]+e)>>>0;q[5]=(q[5]+f)>>>0;q[6]=(q[6]+g)>>>0;q[7]=(q[7]+h)>>>0;}
 update(data){if(!(data instanceof Uint8Array))data=new Uint8Array(data);this.total+=data.length;let p=0;if(this.blen){const n=Math.min(64-this.blen,data.length);this.buf.set(data.subarray(0,n),this.blen);this.blen+=n;p+=n;if(this.blen===64){this._block(this.buf);this.blen=0;}}while(p+64<=data.length){this._block(data,p);p+=64;}if(p<data.length){this.buf.set(data.subarray(p),0);this.blen=data.length-p;}return this;}
 digest(){const total=this.total,buf=this.buf;buf[this.blen++]=0x80;if(this.blen>56){buf.fill(0,this.blen);this._block(buf);this.blen=0;}buf.fill(0,this.blen,56);const hi=Math.floor(total/0x20000000)>>>0,lo=(total*8)>>>0;buf[56]=hi>>>24;buf[57]=hi>>>16;buf[58]=hi>>>8;buf[59]=hi;buf[60]=lo>>>24;buf[61]=lo>>>16;buf[62]=lo>>>8;buf[63]=lo;this._block(buf);const out=new Uint8Array(32);for(let i=0;i<8;i++){const v=this.h[i],j=i*4;out[j]=v>>>24;out[j+1]=v>>>16;out[j+2]=v>>>8;out[j+3]=v;}return out;}
}
const sha256={create:()=>new Sha256Inc()};
function _sha256One(data){return new Sha256Inc().update(data).digest();}
function bytesToHex(b){let s='';for(const x of b)s+=x.toString(16).padStart(2,'0');return s;}
function _u16(b,o){return b[o]|(b[o+1]<<8)} function _u32z(b,o){return (b[o]|(b[o+1]<<8)|(b[o+2]<<16)|(b[o+3]<<24))>>>0}
async function _inflateRaw(bytes){if(typeof DecompressionStream==='undefined')throw new Error('เบราว์เซอร์นี้ไม่มี DeflateStream ที่จำเป็น');const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));return new Uint8Array(await new Response(stream).arrayBuffer());}
class TinyZip{
 constructor(ab){this.bytes=new Uint8Array(ab);this.entries=new Map();this.files={};this._parse();}
 _parse(){const b=this.bytes,min=Math.max(0,b.length-0x10016);let e=-1;for(let i=b.length-22;i>=min;i--)if(_u32z(b,i)===0x06054b50){e=i;break;}if(e<0)throw new Error('Patch ZIP เสีย: ไม่พบ central directory');const n=_u16(b,e+10),off=_u32z(b,e+16);let p=off;const td=new TextDecoder();for(let i=0;i<n;i++){if(_u32z(b,p)!==0x02014b50)throw new Error('Patch ZIP central directory เสีย');const method=_u16(b,p+10),cs=_u32z(b,p+20),us=_u32z(b,p+24),nl=_u16(b,p+28),xl=_u16(b,p+30),cl=_u16(b,p+32),lh=_u32z(b,p+42),name=td.decode(b.subarray(p+46,p+46+nl));const ent={name,method,cs,us,lh};this.entries.set(name,ent);this.files[name]={dir:name.endsWith('/'),async:t=>this._async(ent,t)};p+=46+nl+xl+cl;}}
 file(name){return this.files[name]||null;}
 async _async(e,type){const b=this.bytes,p=e.lh;if(_u32z(b,p)!==0x04034b50)throw new Error('Patch ZIP local header เสีย');const nl=_u16(b,p+26),xl=_u16(b,p+28),start=p+30+nl+xl,comp=b.subarray(start,start+e.cs);let out;if(e.method===0)out=comp.slice();else if(e.method===8)out=await _inflateRaw(comp);else throw new Error('Patch ZIP compression ไม่รองรับ: '+e.method);if(out.length!==e.us)throw new Error('Patch ZIP entry size mismatch: '+e.name);if(type==='text')return new TextDecoder().decode(out);if(type==='uint8array')return out;return out.buffer;}
}
const JSZip={loadAsync:async ab=>new TinyZip(ab)};

// ---- hashBlob.js ----
async function hashBlob(blob,onProgress){
  const h=sha256.create(), chunk=8*1024*1024;
  for(let off=0;off<blob.size;off+=chunk){
    const b=new Uint8Array(await blob.slice(off,Math.min(blob.size,off+chunk)).arrayBuffer());
    h.update(b); onProgress?.(Math.min(1,(off+b.length)/Math.max(1,blob.size)));
    await new Promise(r=>setTimeout(r,0));
  }
  return bytesToHex(h.digest());
}
function hashBytes(bytes){return bytesToHex(_sha256One(bytes));}

// ---- iso9660.js ----
const ISO_SECTOR=2048;
const S=ISO_SECTOR;
const u32le=(b,a)=>new DataView(b.buffer,b.byteOffset+a,4).getUint32(0,true);
const u32be=(b,a)=>new DataView(b.buffer,b.byteOffset+a,4).getUint32(0,false);
async function readBytes(f,start,len){return new Uint8Array(await f.slice(start,start+len).arrayBuffer());}
function cleanName(raw){if(raw.length===1&&raw[0]===0)return'.';if(raw.length===1&&raw[0]===1)return'..';return new TextDecoder('latin1').decode(raw).replace(/;\d+$/,'');}
function parseRecord(bytes,at,absolute,parent){
 const len=bytes[at]; if(!len||at+len>bytes.length||len<34)return null;
 const extent=u32le(bytes,at+2),size=u32le(bytes,at+10),flags=bytes[at+25],nameLen=bytes[at+32];
 if(33+nameLen>len)return null; const name=cleanName(bytes.slice(at+33,at+33+nameLen));
 const isDirectory=(flags&2)!==0; const path=(name==='.'||name==='..'?`${parent}/${name}`:`${parent}/${name}`).replace(/\/+/g,'/').toUpperCase();
 return {path,extent,size,flags,recordOffset:absolute+at,isDirectory};
}
async function walkDirectory(file,extent,size,parent,entries,records,visited){
 if(visited.has(extent))return;visited.add(extent);const absolute=extent*S,bytes=await readBytes(file,absolute,Math.ceil(size/S)*S);let at=0;
 while(at<size){const len=bytes[at];if(!len){at=Math.ceil((at+1)/S)*S;continue;}const r=parseRecord(bytes,at,absolute,parent);if(!r)throw new Error(`ISO directory เสียที่ 0x${(absolute+at).toString(16)}`);records.push(r);if(!r.path.endsWith('/.')&&!r.path.endsWith('/..')){entries.set(r.path,r);if(r.isDirectory)await walkDirectory(file,r.extent,r.size,r.path,entries,records,visited);}at+=len;}
}
async function parsePathTable(file,offset,size,endian){const fields=[];if(!offset||!size)return fields;const b=await readBytes(file,offset,size);let at=0;while(at+8<=b.length){const n=b[at];if(!n)break;const extent=endian==='le'?u32le(b,at+2):u32be(b,at+2);fields.push({offset:offset+at+2,endian,extent});at+=8+n+(n&1);}return fields;}
async function parseIso9660(file){
 let pvdOffset=-1,pvd=null;const descriptorOffsets=[];
 for(let sec=16;sec<64;sec++){const off=sec*S,d=await readBytes(file,off,S),magic=new TextDecoder('ascii').decode(d.slice(1,6));if(magic!=='CD001')throw new Error('ไฟล์นี้ไม่ใช่ PSP ISO9660 ที่รองรับ');if(d[0]===1||d[0]===2)descriptorOffsets.push(off);if(d[0]===1&&pvdOffset<0){pvdOffset=off;pvd=d;}if(d[0]===255)break;}
 if(!pvd)throw new Error('ไม่พบ Primary ISO volume descriptor');
 const volumeSectors=u32le(pvd,80),pathTableSize=u32le(pvd,132),rootExtent=u32le(pvd,158),rootSize=u32le(pvd,166);if(pvd[156]<34)throw new Error('ISO root record ไม่ถูกต้อง');
 const entries=new Map(),records=[],root={path:'/',extent:rootExtent,size:rootSize,flags:pvd[181],recordOffset:pvdOffset+156,isDirectory:true};records.push(root);entries.set('/',root);await walkDirectory(file,rootExtent,rootSize,'',entries,records,new Set());
 const leMain=u32le(pvd,140),leOptional=u32le(pvd,144),beMain=u32be(pvd,148),beOptional=u32be(pvd,152);
 const pathTableFields=[...(await parsePathTable(file,leMain*S,pathTableSize,'le')),...(await parsePathTable(file,leOptional*S,pathTableSize,'le')),...(await parsePathTable(file,beMain*S,pathTableSize,'be')),...(await parsePathTable(file,beOptional*S,pathTableSize,'be'))];
 const pvdPathLocationFields=[{offset:pvdOffset+140,endian:'le',extent:leMain},{offset:pvdOffset+144,endian:'le',extent:leOptional},{offset:pvdOffset+148,endian:'be',extent:beMain},{offset:pvdOffset+152,endian:'be',extent:beOptional}].filter(x=>x.extent>0);
 return {entries,records,volumeSectors,pvdOffset,descriptorOffsets,pathTableFields,pvdPathLocationFields};
}
function getIsoEntry(layout,path){const k=path.replace(/;\d+$/,'').toUpperCase(),e=layout.entries.get(k);if(!e)throw new Error(`ไม่พบไฟล์ใน ISO: ${path}`);return e;}
function isoEntryBlob(file,e){return file.slice(e.extent*S,e.extent*S+e.size);}
function four(value,little){const o=new Uint8Array(4);new DataView(o.buffer).setUint32(0,value>>>0,little);return o;}
