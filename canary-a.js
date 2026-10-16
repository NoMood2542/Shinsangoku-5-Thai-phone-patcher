// THAI100 C4C-RE1 Canary A shim — diagnostic only, no release bump.
const CANARY_A_PACKAGE_ZIP_SHA='14a0cb1609ab9d1eae0de9c7ff31b9b94e11a9f1401ed5d4ad01ead38a56d14c';
const _basePatchOfficialThaiCanaryA=patchOfficialThai;
loadAssets=async function(){
 if(assetPromise)return assetPromise;
 if(!packageFile)throw new Error('กรุณาเลือก C4C-RE1 Canary A ZIP ก่อน');
 assetPromise=(async()=>{
  const ab=await packageFile.arrayBuffer(),zbytes=new Uint8Array(ab);
  if(hashBytes(zbytes)!==CANARY_A_PACKAGE_ZIP_SHA)throw new Error('Canary A ZIP SHA-256 ไม่ตรงแพ็กทดสอบที่รองรับ');
  const zip=await JSZip.loadAsync(ab);
  const mn=Object.keys(zip.files).find(n=>n.endsWith('/PAYLOAD_MANIFEST.json')||n==='PAYLOAD_MANIFEST.json');
  if(!mn)throw new Error('PAYLOAD_MANIFEST.json missing');
  const root=mn.slice(0,-'PAYLOAD_MANIFEST.json'.length),manifest=JSON.parse(await zip.file(mn).async('text'));
  if(manifest?.schema!=='THAI100_OFFICIALTHAI_PAYLOAD_MANIFEST_C4C_P2_RUNTIME_CANDIDATE')throw new Error('Canary A manifest base schema mismatch');
  if(manifest?.c4c_re1_canary_a?.schema!=='THAI100_C4C_RE1_CANARY_A_V1')throw new Error('ไม่ใช่ C4C-RE1 Canary A package');
  if(manifest?.records?.['01']?.['1']?.sha256!=='79b40c64ebd2ff3d6afd03ae0b374a0c4dcccd45d2e6253416830cf5a6bad3e9')throw new Error('Canary A font payload hash mismatch');
  return {zip,root,manifest};
 })();
 return assetPromise;
};
patchOfficialThai=async function(sourceIso,onProgress){
 const r=await _basePatchOfficialThaiCanaryA(sourceIso,onProgress);
 const base=sourceIso.name.replace(/\.iso$/i,'');
 r.fileName=`${base}_THAI100_C4C_RE1_CANARY_A.iso`;
 r.report.schema='THAI100_C4C_RE1_CANARY_A_IPHONE_BUILD_V1';
 r.report.status='DIAGNOSTIC_STATIC_BUILD_PASS__PPSSPP_CAUSAL_TEST_REQUIRED';
 r.report.candidate_id='C4C_RE1_CANARY_A';
 r.report.description='Single-variable diagnostic: only 01:0001 / global 0x571 is repacked to the CN-runtime-proven page roles (part0=12px, part1=14px).';
 r.report.payload_zip_sha256=CANARY_A_PACKAGE_ZIP_SHA;
 r.report.c4c_re1_canary_a=(await loadAssets()).manifest.c4c_re1_canary_a;
 r.report.runtime_flow='Cold Boot -> inspect dynamic Thai -> enter Settings immediately -> return -> Character Select -> Battle Preparation -> Gameplay';
 r.report.runtime_checks=['Dynamic Thai no longer fragmented','Settings opens or hangs','Return from Settings','Gameplay'];
 r.report.verdict_rule={
  PASS:'Thai readable and Settings opens: page-role defect likely caused both symptoms.',
  FONT_LAYOUT_FAIL:'Thai readable but Settings hangs: font corruption fixed; Settings is a separate defect.',
  CRASH:'Thai still fragmented/corrupt or another blocking failure: reject or re-isolate.'
 };
 r.report.builder='iPhone Safari GitHub Pages C4C-RE1 Canary A';
 return r;
};
