// THAI100 C4C-RE1 Canary B2 shim — targeted Memory Stick Duo™ glyph diagnostic only.
const CANARY_B2_PACKAGE_ZIP_SHA='31cdf2f6a6fec5d6f12980bacd1742b0d20f5e58f8b603787392fc39d5d4cf03';
const CANARY_B2_FONT_SHA='4f79f96988047a8bc036506747811072d8d5a2861ccd0a85da80d396fab8827e';
const _basePatchOfficialThaiCanaryB2=patchOfficialThai;
loadAssets=async function(){
 if(assetPromise)return assetPromise;
 if(!packageFile)throw new Error('กรุณาเลือก C4C-RE1 Canary B2 ZIP ก่อน');
 assetPromise=(async()=>{
  const ab=await packageFile.arrayBuffer(),zbytes=new Uint8Array(ab);
  if(hashBytes(zbytes)!==CANARY_B2_PACKAGE_ZIP_SHA)throw new Error('Canary B2 ZIP SHA-256 ไม่ตรงแพ็กทดสอบที่รองรับ');
  const zip=await JSZip.loadAsync(ab);
  const mn=Object.keys(zip.files).find(n=>n.endsWith('/PAYLOAD_MANIFEST.json')||n==='PAYLOAD_MANIFEST.json');
  if(!mn)throw new Error('PAYLOAD_MANIFEST.json missing');
  const root=mn.slice(0,-'PAYLOAD_MANIFEST.json'.length),manifest=JSON.parse(await zip.file(mn).async('text'));
  if(manifest?.schema!=='THAI100_OFFICIALTHAI_PAYLOAD_MANIFEST_C4C_P2_RUNTIME_CANDIDATE')throw new Error('Canary B2 manifest base schema mismatch');
  if(manifest?.c4c_re1_canary_b2?.schema!=='THAI100_C4C_RE1_CANARY_B2_TARGETED_MEMORY_STICK_GLYPHS_V1')throw new Error('ไม่ใช่ C4C-RE1 Canary B2 package');
  if(manifest?.records?.['01']?.['1']?.sha256!==CANARY_B2_FONT_SHA)throw new Error('Canary B2 font payload hash mismatch');
  return {zip,root,manifest};
 })();
 return assetPromise;
};
patchOfficialThai=async function(sourceIso,onProgress){
 const r=await _basePatchOfficialThaiCanaryB2(sourceIso,onProgress);
 const base=sourceIso.name.replace(/\.iso$/i,'');
 r.fileName=`${base}_THAI100_C4C_RE1_CANARY_B2.iso`;
 r.report.schema='THAI100_C4C_RE1_CANARY_B2_IPHONE_BUILD_V1';
 r.report.status='DIAGNOSTIC_STATIC_BUILD_PASS__PPSSPP_TARGETED_GLYPH_TEST_REQUIRED';
 r.report.candidate_id='C4C_RE1_CANARY_B2';
 r.report.description='Targeted follow-up to Canary A: only the effective 14 glyph masks needed by Memory Stick Duo™ differ; all other 692 logical glyphs remain exact vs Canary A.';
 r.report.payload_zip_sha256=CANARY_B2_PACKAGE_ZIP_SHA;
 r.report.c4c_re1_canary_b2=(await loadAssets()).manifest.c4c_re1_canary_b2;
 r.report.runtime_flow='Cold Boot -> storage/install prompt -> verify Memory Stick Duo™ -> enter Settings immediately -> return';
 r.report.runtime_checks=['Memory Stick Duo™ readable','Thai remains readable','Settings opens','Return from Settings'];
 r.report.verdict_rule={
  PASS:'Prompt fixed and Settings passes: keep B2, reject broad Canary B, proceed to layout isolation.',
  FONT_LAYOUT_FAIL:'Prompt fixed but Settings crashes/hangs: bisect the 14 changed glyphs.',
  CRASH:'Prompt still corrupt or other regression: stop and trace byte->u16->glyph index path.'
 };
 r.report.builder='iPhone Safari GitHub Pages C4C-RE1 Canary B2';
 return r;
};
