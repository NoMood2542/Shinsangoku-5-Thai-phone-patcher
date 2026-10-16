// THAI100 C4C-RE1 Canary B shim — diagnostic only, no release bump.
const CANARY_B_PACKAGE_ZIP_SHA='e1c2a976bdfb4aa2d27651b3232a7f94250fec557b79ddad1d52df933a90300d';
const CANARY_B_FONT_SHA='b9b0667cf9de9cc53c532f78daa99fef2cd6789237ec85cf7681cf5fa5065579';
const _basePatchOfficialThaiCanaryB=patchOfficialThai;
loadAssets=async function(){
 if(assetPromise)return assetPromise;
 if(!packageFile)throw new Error('กรุณาเลือก C4C-RE1 Canary B ZIP ก่อน');
 assetPromise=(async()=>{
  const ab=await packageFile.arrayBuffer(),zbytes=new Uint8Array(ab);
  if(hashBytes(zbytes)!==CANARY_B_PACKAGE_ZIP_SHA)throw new Error('Canary B ZIP SHA-256 ไม่ตรงแพ็กทดสอบที่รองรับ');
  const zip=await JSZip.loadAsync(ab);
  const mn=Object.keys(zip.files).find(n=>n.endsWith('/PAYLOAD_MANIFEST.json')||n==='PAYLOAD_MANIFEST.json');
  if(!mn)throw new Error('PAYLOAD_MANIFEST.json missing');
  const root=mn.slice(0,-'PAYLOAD_MANIFEST.json'.length),manifest=JSON.parse(await zip.file(mn).async('text'));
  if(manifest?.schema!=='THAI100_OFFICIALTHAI_PAYLOAD_MANIFEST_C4C_P2_RUNTIME_CANDIDATE')throw new Error('Canary B manifest base schema mismatch');
  if(manifest?.c4c_re1_canary_b?.schema!=='THAI100_C4C_RE1_CANARY_B_NONTHAI_MASK_RESTORE_V1')throw new Error('ไม่ใช่ C4C-RE1 Canary B package');
  if(manifest?.records?.['01']?.['1']?.sha256!==CANARY_B_FONT_SHA)throw new Error('Canary B font payload hash mismatch');
  return {zip,root,manifest};
 })();
 return assetPromise;
};
patchOfficialThai=async function(sourceIso,onProgress){
 const r=await _basePatchOfficialThaiCanaryB(sourceIso,onProgress);
 const base=sourceIso.name.replace(/\.iso$/i,'');
 r.fileName=`${base}_THAI100_C4C_RE1_CANARY_B.iso`;
 r.report.schema='THAI100_C4C_RE1_CANARY_B_IPHONE_BUILD_V1';
 r.report.status='DIAGNOSTIC_STATIC_BUILD_PASS__PPSSPP_ASCII_GATE_REQUIRED';
 r.report.candidate_id='C4C_RE1_CANARY_B';
 r.report.description='Single-variable follow-up to Canary A: keep all 608 Thai logical masks byte-exact and restore 98 non-Thai logical glyph masks to intended C3D/CN sources.';
 r.report.payload_zip_sha256=CANARY_B_PACKAGE_ZIP_SHA;
 r.report.c4c_re1_canary_b=(await loadAssets()).manifest.c4c_re1_canary_b;
 r.report.runtime_flow='Cold Boot -> trigger storage/install prompt -> inspect Memory Stick Duo™ -> Settings -> Character Select';
 r.report.runtime_checks=['Memory Stick Duo™ readable','Thai remains readable','Settings opens and returns','No new glyph corruption'];
 r.report.verdict_rule={
  PASS:'ASCII/non-Thai masks fixed without Thai regression; proceed to layout/measurement isolation.',
  FONT_LAYOUT_FAIL:'ASCII fixed but layout/clipping remains; proceed to targeted layout pass.',
  CRASH:'ASCII still corrupt or any regression; stop and trace ASCII byte->u16->glyph index path.'
 };
 r.report.builder='iPhone Safari GitHub Pages C4C-RE1 Canary B';
 return r;
};
