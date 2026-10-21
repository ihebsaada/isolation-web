// REVIEW PROTOTYPE ONLY: not imported by Next.js or the live qualification flow.
import { normalizeCity, normalizePostalCode, validPostalCode } from '../../src/lib/service-area.ts';

export function evaluateCoverageProposal(city, postalCode, snapshot, policy) {
  const result = (status,reason,municipalityId=null) => ({status,reason,municipalityId});
  if(typeof postalCode!=='string'||!validPostalCode(postalCode))return result('invalid','postal_format');
  if(typeof city!=='string'||normalizeCity(city).length<2)return result('invalid','city_missing');
  if(!snapshot?.municipalities||!snapshot?.names||!snapshot?.postals)return result('pending','reference_unavailable');
  const ids=snapshot.names[normalizeCity(city)]||[];
  if(ids.length!==1)return result('pending',ids.length?'city_ambiguous':'city_unknown');
  const id=ids[0],municipality=snapshot.municipalities[id];
  if(!municipality)return result('pending','municipality_reference_missing',id);
  const linked=snapshot.postals[normalizePostalCode(postalCode)];
  if(!linked?.length)return result('pending','postal_unknown_or_retired',id);
  if(!linked.includes(id))return result('invalid','city_postal_mismatch',id);
  if(linked.length>1)return result('pending','postal_shared_between_municipalities',id);
  if(!policy?.validated || !policy.version)return result('pending','policy_not_validated',id);
  if(!snapshot.version || policy.snapshotVersion!==snapshot.version)return result('pending','reference_version_not_validated',id);
  const inside=policy.approvedIds?.includes(id),outside=policy.excludedIds?.includes(id);
  if(inside&&outside)return result('pending','contradictory_policy',id);
  if(inside)return result('inside','explicitly_approved_municipality',id);
  if(outside)return result('outside','explicitly_excluded_municipality',id);
  return result('pending','municipality_not_reviewed',id);
}

// Evidence of a shared segment requires the exact original segment, regardless
// of direction. No buffer, radius, rounding or tolerance is introduced. Failure
// to find a segment is unresolved, never proof that only a point is shared.
export function segmentKeys(geometry) {
  const keys=new Set();
  for(const ring of geometry?.rings||[])for(let i=1;i<ring.length;i++){
    const a=ring[i-1].slice(0,2).join(','),b=ring[i].slice(0,2).join(',');
    if(a!==b)keys.add(a<b?a+'|'+b:b+'|'+a);
  }
  return keys;
}

export function hasSharedSegment(first,second) {
  const a=segmentKeys(first),b=segmentKeys(second);
  return [...a].some(key=>b.has(key));
}
