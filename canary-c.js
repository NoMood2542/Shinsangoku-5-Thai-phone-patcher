// THAI100 C4C-RE1 Canary C shim — diagnostic only, no release bump.
const CANARY_C_PACKAGE_ZIP_SHA='874c80675a7a85bee4807dcb3b40f4ffc434830a817b6a69f755189b545a8643';
const _basePatchOfficialThaiCanaryC=patchOfficialThai;
loadAssets=async function(){
 if(assetPromise)return assetPromise;
 if(!packageFile)throw new Error('กรุณาเลือก C4C-RE1 Canary C ZIP ก่อน');
 assetPromise=(async()=>{
  const ab=await packageFile.arrayBuffer(),zbytes=new Uint8Array(ab);
  if(hashBytes(zbytes)!==CANARY_C_PACKAGE_ZIP_SHA)throw new Error('Canary C ZIP SHA-256 ไม่ตรงแพ็กทดสอบที่รองรับ');
  const zip=await JSZip.loadAsync(ab);
  const mn=Object.keys(zip.files).find(n=>n.endsWith('/PAYLOAD_MANIFEST.json')||n==='PAYLOAD_MANIFEST.json');
  if(!mn)throw new Error('PAYLOAD_MANIFEST.json missing');
  const root=mn.slice(0,-'PAYLOAD_MANIFEST.json'.length),manifest=JSON.parse(await zip.file(mn).async('text'));
  if(manifest?.schema!=='THAI100_OFFICIALTHAI_PAYLOAD_MANIFEST_C4C_P2_RUNTIME_CANDIDATE')throw new Error('Canary C manifest base schema mismatch');
  if(manifest?.c4c_re1_canary_c?.schema!=='THAI100_C4C_RE1_CANARY_C_V1')throw new Error('ไม่ใช่ C4C-RE1 Canary C package');
  if(manifest?.records?.['01']?.['1']?.sha256!=='e32dd8fe3079fd6ad99b53176ea10f6ddeaaf0623ab65eed2af621d8d7c53010')throw new Error('Canary C font payload hash mismatch');
  return {zip,root,manifest};
 })();
 return assetPromise;
};
patchOfficialThai=async function(sourceIso,onProgress){
 const r=await _basePatchOfficialThaiCanaryC(sourceIso,onProgress);
 const base=sourceIso.name.replace(/\.iso$/i,'');
 r.fileName=`${base}_THAI100_C4C_RE1_CANARY_C.iso`;
 r.report.schema='THAI100_C4C_RE1_CANARY_C_IPHONE_BUILD_V1';
 r.report.status='DIAGNOSTIC_STATIC_BUILD_PASS__PPSSPP_REQUIRED';
 r.report.candidate_id='C4C_RE1_CANARY_C';
 r.report.description='Canary A page-role fix plus non-Thai ASCII/legacy/custom glyph provenance repair. All 608 Thai masks remain exact to Canary A.';
 r.report.payload_zip_sha256=CANARY_C_PACKAGE_ZIP_SHA;
 r.report.c4c_re1_canary_c=(await loadAssets()).manifest.c4c_re1_canary_c;
 r.report.runtime_flow='Cold Boot -> Memory Stick/install prompt -> Settings -> Encyclopedia -> Character Select -> Battle Preparation -> cutscene/gameplay';
 r.report.runtime_checks=['Memory Stick Duo literal readable','Thai appearance unchanged from Canary A','digits and punctuation readable','Settings remains responsive','remaining issues classified as glyph vs spacing/wrap'];
 r.report.verdict_rule={
  PASS:'Legacy/ASCII repair passes: Memory Stick Duo and punctuation/digits render correctly; no Thai regression.',
  FONT_LAYOUT_FAIL:'Glyphs are readable but spacing/wrap/layout defects remain; proceed to typography/layout RE.',
  CRASH:'ASCII still corrupt or Canary A behavior regressed; reject/re-isolate.'
 };
 r.report.builder='iPhone Safari GitHub Pages C4C-RE1 Canary C';
 return r;
};
