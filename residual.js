// THAI100 OfficialThai v1.0.0 — residual Japanese cleanup layer.
// Runs on top of the proven v0.9 payload. It changes only one fixed-size EBOOT slot.
const RESIDUAL_V1={
  ebootOriginalSha:'cf9348d172cfcf112f231529727942b90cfdc92fbde4d48f88a619b84e09e8a6',
  ebootPatchedSha:'6c6e6453b3c63ff2178dcc609315a86dd8192e109f087de5e12fff2595762d58',
  slotOffset:0x2D4C28,
  slotBytes:114,
  oldSlotSha:'23ac8695cf01b0bbf64af7861e882f3021dadb40c1c7bdfab55a2e61de5aca1f',
  thaiHex:'e1b5e19ae189e05ee2d1e174e15ce088e285e09be1a5e1e2e365e19aa140a2e3a2e0a2daa140e155e365e19ae2b0e365e09b0ae180e365e09be2fbe19ae366e180e2f7e29be366e1aee1560ae25ee2f7e178e2f7e369e0d9e36be264e36be155',
  thaiPayloadBytes:96,
  headroomBytes:18
};
function _hexBytesV1(s){const out=new Uint8Array(s.length/2);for(let i=0;i<out.length;i++)out[i]=parseInt(s.slice(i*2,i*2+2),16);return out;}
function _eqHexV1(bytes,hex){return hashBytes(bytes)===hex;}
const _loadAssetsV09=loadAssets;
const _assetBytesV09=assetBytes;
const _patchOfficialThaiV09=patchOfficialThai;

// Make the v0.9 builder treat the cleaned EBOOT as the expected final EBOOT so its
// existing 5/5 output verification + final ISO SHA pass remain authoritative.
loadAssets=async function(){
  const assets=await _loadAssetsV09();
  if(!assets.__residualV1ManifestPatched){
    const e=assets.manifest?.eboot;
    if(!e||e.sha256!==RESIDUAL_V1.ebootOriginalSha)throw new Error('FAIL-CLOSED: v0.9 EBOOT manifest ไม่ตรง baseline ที่ v1.0 รองรับ');
    e.sha256=RESIDUAL_V1.ebootPatchedSha;
    assets.__residualV1ManifestPatched=true;
  }
  return assets;
};

assetBytes=async function(assets,path,spec){
  if(path===assets?.manifest?.eboot?.file){
    const f=assets.zip.file(assets.root+path);if(!f)throw new Error('payload missing: '+path);
    const src=await f.async('uint8array');
    if(src.length!==24812676)throw new Error('FAIL-CLOSED: EBOOT baseline size mismatch');
    if(hashBytes(src)!==RESIDUAL_V1.ebootOriginalSha)throw new Error('FAIL-CLOSED: EBOOT baseline SHA-256 mismatch');
    const a=RESIDUAL_V1.slotOffset,b=a+RESIDUAL_V1.slotBytes,old=src.slice(a,b);
    if(hashBytes(old)!==RESIDUAL_V1.oldSlotSha)throw new Error('FAIL-CLOSED: residual JP slot baseline mismatch @ 0x2D4C28');
    const thai=_hexBytesV1(RESIDUAL_V1.thaiHex);
    if(thai.length!==RESIDUAL_V1.thaiPayloadBytes)throw new Error('internal v1 Thai payload length mismatch');
    const slot=new Uint8Array(RESIDUAL_V1.slotBytes);slot.set(thai);
    const out=src.slice();out.set(slot,a);
    if(hashBytes(out)!==RESIDUAL_V1.ebootPatchedSha)throw new Error('FAIL-CLOSED: cleaned EBOOT SHA-256 mismatch');
    return out;
  }
  return _assetBytesV09(assets,path,spec);
};

patchOfficialThai=async function(sourceIso,onProgress){
  const r=await _patchOfficialThaiV09(sourceIso,onProgress);
  const base=sourceIso.name.replace(/\.iso$/i,'');
  r.fileName=`${base}_THAI_OFFICIALTHAI_RESIDUAL_CLEANUP_v1.0.0.iso`;
  const rep=r.report;
  rep.schema='THAI100_OFFICIALTHAI_RESIDUAL_JP_CLEANUP_BUILD_V1_IPHONE';
  rep.status='STATIC_RESIDUAL_JP_CLEAN__PPSSPP_REGRESSION_REQUIRED';
  rep.candidate_id='RESIDUAL_JP_CLEANUP_V1';
  rep.description='Proven v0.9 full causal regression + same-size cleanup of the sole high-confidence residual Japanese EBOOT block.';
  rep.residual_jp_cleanup={
    status:'STATIC_PROVEN_REMOVED',
    high_confidence_blocks_before:1,
    high_confidence_blocks_after:0,
    eboot_offset_decimal:RESIDUAL_V1.slotOffset,
    eboot_offset_hex:'0x2D4C28',
    slot_bytes:RESIDUAL_V1.slotBytes,
    thai_payload_bytes:RESIDUAL_V1.thaiPayloadBytes,
    headroom_bytes:RESIDUAL_V1.headroomBytes,
    old_slot_sha256:RESIDUAL_V1.oldSlotSha,
    original_eboot_sha256:RESIDUAL_V1.ebootOriginalSha,
    cleaned_eboot_sha256:RESIDUAL_V1.ebootPatchedSha,
    official_cn_retained_same_japanese_block:true,
    official_kr_retained_same_japanese_block:true,
    structural_change:'NONE__FIXED_SIZE_IN_PLACE_SLOT',
    note:'Static cleanup only; this legacy Internet record-upload path may be dormant and has no active-UI proof.'
  };
  rep.internal_hashes.EBOOT=RESIDUAL_V1.ebootPatchedSha;
  rep.runtime_test_count=1;
  rep.runtime_flow='Boot -> Menu -> Character Select -> Cutscene -> Battle Preparation -> Start Battle -> Gameplay';
  rep.verdict_rule={
    PASS:'Residual-JP cleanup introduced no regression. The one high-confidence Japanese block is statically removed.',
    HANG_BATTLE_PREP:'Regression/new defect. Preserve both previously confirmed causal repairs; do not reopen them without evidence.',
    CRASH:'Regression/new crash. Capture PC/RA; preserve both previously confirmed causal repairs.'
  };
  rep.builder='iPhone Safari GitHub-only v1.0.0';
  return r;
};
