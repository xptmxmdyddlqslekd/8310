// =====================================================================
// 함박꽃북토리 공용 정보 (Firebase) — 활동 안내 사이트·관리자·검색 PC·온라인 도서관이 같이 씁니다.
//
// Firestore 구조 (컬렉션 shared)
//   shared/manifest      : 각 자료의 버전 { site:{v}, onchaek:{v}, readings:{v}, lectures:{v, chunks} }
//   shared/site          : 문구·링크·일정·이용 안내   { json: "..." }
//   shared/onchaek       : 온책읽기 목록               { json: "..." }
//   shared/readings      : 낭독극 작품 목록            { json: "..." }
//   shared/lectures-0..n : 작가와의 만남 강연 목록(나눠 저장) { json: "[...]" }
//   shared/img-...       : 관리자 페이지에서 올린 사진  { data: "data:image/jpeg;base64,..." }
// =====================================================================
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-lite.js';

export const firebaseConfig = {
  apiKey: "AIzaSyAojUOMSLFmMZSG5B77_d25uLkC7Z7hlwo",
  authDomain: "library-103be.firebaseapp.com",
  projectId: "library-103be",
  storageBucket: "library-103be.firebasestorage.app",
  messagingSenderId: "403104539402",
  appId: "1:403104539402:web:99fca45af1dd8782f790f3"
};

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const SHARED_KEYS = ['site', 'onchaek', 'readings', 'lectures'];
export const LECTURE_CHUNK = 400;   // 강연 목록을 문서 하나에 400개씩 나눠 저장

const CACHE_PREFIX = 'libShared:';
function cacheGet(key){ try{ return JSON.parse(localStorage.getItem(CACHE_PREFIX+key) || 'null'); }catch(e){ return null; } }
function cacheSet(key, v, data){ try{ localStorage.setItem(CACHE_PREFIX+key, JSON.stringify({v, data})); }catch(e){} }

async function readJsonDoc(id){
  const s = await getDoc(doc(db, 'shared', id));
  return s.exists() ? JSON.parse(s.data().json) : null;
}

export async function readManifest(){
  const s = await getDoc(doc(db, 'shared', 'manifest'));
  return s.exists() ? s.data() : null;
}

// 공용 정보 읽기. 바뀐 자료만 새로 받고 나머지는 이 브라우저에 저장해 둔 것을 씀.
// 반환: { site, onchaek, readings, lectures, manifest } — Firebase가 비어 있으면 null
export async function loadShared(keys = SHARED_KEYS, opts = {}){
  const man = await readManifest();
  if(!man) return null;
  const out = { manifest: man };
  await Promise.all(keys.map(async key => {
    const info = man[key];
    if(!info) return;
    const cached = opts.noCache ? null : cacheGet(key);
    if(cached && cached.v === info.v){ out[key] = cached.data; return; }
    let data;
    if(key === 'lectures'){
      const n = info.chunks || 0;
      const parts = await Promise.all(Array.from({length:n}, (_,i) => readJsonDoc('lectures-'+i)));
      data = parts.flatMap(p => p || []);
    } else {
      data = await readJsonDoc(key);
    }
    if(data != null){ out[key] = data; cacheSet(key, info.v, data); }
  }));
  return out;
}

// 관리자 페이지에서 올린 사진 (src가 "fs:img-..." 인 것)
export async function loadPhoto(id){
  const s = await getDoc(doc(db, 'shared', id));
  return s.exists() ? s.data().data : null;
}
