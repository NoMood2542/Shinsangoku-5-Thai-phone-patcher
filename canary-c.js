// THAI100 C4C-RE1 Canary C shim — diagnostic only, no release bump.
const CANARY_C_PACKAGE_ZIP_SHA='3c53dad44a7c165c5be2e7004dd1396d8af5a249fd50675731f4ded44c43e9ca';
const CANARY_C_RECORD59_SHA='4f1a913b3f8267c7bd66663d4827071a4e0ec9b2ffa1481d84913a987e0f357d';
const CANARY_C_FONT_SHA='b9b0667cf9de9cc53c532f78daa99fef2cd6789237ec85cf7681cf5fa5065579';
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
  if(manifest?.c4c_re1_canary_c?.schema!=='THAI100_C4C_RE1_CANARY_C_CHARACTER_BIO_ENVELOPE_V1')throw new Error('ไม่ใช่ C4C-RE1 Canary C package');
  if(manifest?.records?.['01']?.['59']?.sha256!==CANARY_C_RECORD59_SHA)throw new Error('Canary C record 0059 hash mismatch');
  if(manifest?.records?.['01']?.['1']?.sha256!==CANARY_C_FONT_SHA)throw new Error('Canary B font freeze drifted');
  return {zip,root,manifest};
 })();
 return assetPromise;
};
patchOfficialThai=async function(sourceIso,onProgress){
 const r=await _basePatchOfficialThaiCanaryC(sourceIso,onProgress);
 const base=sourceIso.name.replace(/\.iso$/i,'');
 r.fileName=`${base}_THAI100_C4C_RE1_CANARY_C.iso`;
 r.report.schema='THAI100_C4C_RE1_CANARY_C_IPHONE_BUILD_V1';
 r.report.status='DIAGNOSTIC_STATIC_BUILD_PASS__PPSSPP_CHARACTER_BIO_GATE_REQUIRED';
 r.report.candidate_id='C4C_RE1_CANARY_C';
 r.report.description='Single-field layout canary: Zhao Yun character biography only, 0x5AB / record 0059 / pointer index 10. Font/EBOOT/codepage frozen from runtime-passed Canary B.';
 r.report.payload_zip_sha256=CANARY_C_PACKAGE_ZIP_SHA;
 r.report.c4c_re1_canary_c=(await loadAssets()).manifest.c4c_re1_canary_c;
 r.report.runtime_flow='Cold Boot -> Character Select -> Zhao Yun -> inspect four-line biography -> Settings regression spot-check';
 r.report.runtime_checks=['Zhao Yun biography stays inside panel','Thai font unchanged','Memory Stick Duo remains correct','Settings opens and returns'];
 r.report.verdict_rule={
  PASS:'Text-envelope correction works; bulk-reflow the remaining character biographies and continue to next screenshot-confirmed layout family.',
  FONT_LAYOUT_FAIL:'Bio still clips/crowds; map exact widget bounds/consumer geometry before bulk reflow.',
  CRASH:'Any regression: reject Canary C; font/EBOOT must remain frozen.'
 };
 r.report.builder='iPhone Safari GitHub Pages C4C-RE1 Canary C';
 return r;
};
