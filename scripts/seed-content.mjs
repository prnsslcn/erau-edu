// 실제 강의 콘텐츠 시드: 챕터 + 영상 + PDF 자료(Storage 업로드)
//
// 사용법:
//   node --env-file=.env.local scripts/seed-content.mjs
//
// PDF 원본은 _content/pdfs/ 에 있어야 합니다. (.gitignore 제외)
// 주의: 기존 chapters/videos/materials/진도/Storage 파일을 모두 지우고 새로 채웁니다.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PDF_DIR = join(process.cwd(), "_content", "pdfs");

// UND VFR Maneuvers 플레이리스트 21개
const UND = [
  "dx3WOSqGGTY", "Ml8YI7oj2Q8", "24LySNN3SCE", "4Fmp0vUfUsY", "HUD0WOE4-rU",
  "N9peksS0FOw", "AGVkcq_Z3i4", "k61_yfVg11Q", "NpgRnaPDhx8", "8-xSi6s2qqE",
  "c4XbkwMdZvY", "kqLh8TMNtEM", "rLkvixe4oHo", "AY2TIbQ4_HU", "QoCYAAAy-eA",
  "ISchcfahb_c", "YImaxGbKv0I", "9nzlQhXQEOc", "IBexBcCaKeU", "8OdqnIqrrQ0",
  "yJb2dYtxfpE",
];

const CHAPTERS = [
  {
    title: "Principles of Flight & Aerodynamics",
    description: "기본적인 비행 지식 및 양력 발생요인",
    videos: ["5O-j0w-h7v0", "2YDKCAkigBs", "kvQqdawXb44", "hKUJNkW5WvA", "1e2DJw6_4MI"],
    pdfs: [
      "AS 121_Lesson 03_Principles of Flight.pdf",
      "AS 121_Lesson 04_Aerodynamics of Flight.pdf",
    ],
  },
  {
    title: "Aircraft Structure, Systems & Instruments",
    description: "비행기 구조 및 시스템, 계기",
    videos: [
      "eAIGNjcqRX4", "WhQ8Ai4fa_Q", "gIdXLMVP6VU", "skv6CgCY3vM", "rya4YFDpsPs",
      "cWDCXFwPLIs", "M1UddxRAjbc", "d5sXmNplQHw", "MVlEOlM-DPo",
      "hVsx4XWafXg", "kdFGbUouE_4", "4dDKjdj_Dvc",
      "WsXxoqfaTFw",
    ],
    pdfs: [
      "AS 121_Lesson 05_Aircraft Structure.pdf",
      "AS 121_Lesson 06_Flight Controls.pdf",
      "AS 121_Lesson 07_Aircraft Systems.pdf",
      "AS 121_Lesson 08_Flight Instruments.pdf",
      "AS 121_Lesson 09_G1000.pdf",
    ],
  },
  {
    title: "Weight, Balance & Performance",
    description: "비행기 무게배분 및 퍼포먼스 영향",
    videos: ["7zls5KPl0Jw"],
    pdfs: [
      "AS 121_Lesson 10_Weight and Balance.pdf",
      "AS 121_Lesson 11_Aircraft Performance.pdf",
    ],
  },
  {
    title: "Flight Maneuvers",
    description: "비행 기동 관련 (maneuver) — UND VFR Maneuvers 플레이리스트 포함",
    videos: [
      "hKUJNkW5WvA", "0fJyjBLIG68", "x-kooowBrCg", "JEVKxX3CVK4", "YzNSBTxH_Cs",
      "yxy2MnUnfUM", "ns2Oiys2sc8",
      ...UND,
    ],
    pdfs: ["AS 121_Lesson 12, 13, and 14_Maneuvers.pdf"],
  },
  {
    title: "Regulations & Airworthiness",
    description: "비행기 서류 관련 (규정·증명서·감항성)",
    videos: [],
    pdfs: [
      "AS 121_Lesson 15, 16, 17_Regulatory Guidance, Certificates and Documents, Airworthiness Requirements.pdf",
    ],
  },
  {
    title: "Human Factors & Decision Making",
    description: "조종사 요인(건강·스트레스) 및 관리, 의사결정",
    videos: [],
    pdfs: [
      "AS 121_Lesson 20_Human Factors.pdf",
      "AS 121_Lesson 21_Aeronautical Decision Making and Risk Management.pdf",
    ],
  },
  {
    title: "Weather, Airspace & Communications",
    description: "날씨 설명 및 항공날씨 서비스 + 공역·라디오",
    videos: ["1XtcqIv_EHs", "o4lg8UfY5DM", "1e2DJw6_4MI", "hbNwChE4zqg", "0e_bW4Ib5-Q", "c6ZieuNvjHw", "V_AgxK9JQVU"],
    pdfs: [
      "AS 121_Lesson 22_Weather Theory.pdf",
      "AS 121_Lesson 23_Aviation Weather Services.pdf",
      "AS 121_Lesson 24_Airport Operations.pdf",
      "AS 121_Lesson 25_Radio Communications.pdf",
      "AS 121_Lesson 26_Controlled and Uncontrolled Airspace.pdf",
      "AS 121_Lesson 27_Special Use and Other Airspace.pdf",
    ],
  },
  {
    title: "Cross-Country Flight",
    description: "장주 비행 (cross country) — 비행 계획 및 우회",
    videos: ["u6AU5DfG8A0"],
    pdfs: [
      "AS 121_Lesson 31_Cross-Country Flight Planning_Test Prep.pdf",
      "AS 121_Lesson 32_Lost and Diversion.pdf",
    ],
  },
];

function matTitle(filename) {
  return filename
    .replace(/^AS 121_/, "")
    .replace(/\.pdf$/i, "")
    .replaceAll("_", " · ");
}
function safePath(chapterId, filename) {
  const safe = filename.replace(/[^\w.\-]+/g, "_");
  return `${chapterId}/${safe}`;
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// ── 0) 기존 데이터 정리 (chapters 삭제 → videos/materials/진도 cascade) ──
console.log("기존 데이터 정리...");
{
  // Storage 비우기
  const { data: files } = await db.storage.from("materials").list("", { limit: 1000 });
  // 폴더 구조라 재귀적으로 비우기 위해 챕터 폴더별 list
  const { data: chs } = await db.from("chapters").select("id");
  for (const c of chs ?? []) {
    const { data: inner } = await db.storage.from("materials").list(c.id, { limit: 1000 });
    if (inner?.length) {
      await db.storage.from("materials").remove(inner.map((f) => `${c.id}/${f.name}`));
    }
  }
  if (files?.length) {
    await db.storage.from("materials").remove(files.filter((f) => f.id).map((f) => f.name));
  }
  await db.from("chapters").delete().neq("id", "00000000-0000-0000-0000-000000000000");
}

// ── 1) 챕터/영상/자료 생성 ──
let totalVideos = 0;
let totalMaterials = 0;

for (let ci = 0; ci < CHAPTERS.length; ci++) {
  const c = CHAPTERS[ci];
  const { data: chapter, error: ce } = await db
    .from("chapters")
    .insert({ title: c.title, description: c.description, position: ci, is_published: true })
    .select("id")
    .single();
  if (ce) throw new Error(`챕터 생성 실패 (${c.title}): ${ce.message}`);

  // 영상
  if (c.videos.length > 0) {
    const rows = c.videos.map((yid, i) => ({
      chapter_id: chapter.id,
      youtube_id: yid,
      position: i,
    }));
    const { error: ve } = await db.from("videos").insert(rows);
    if (ve) throw new Error(`영상 생성 실패 (${c.title}): ${ve.message}`);
    totalVideos += rows.length;
  }

  // 자료 (PDF 업로드 + 행)
  for (let mi = 0; mi < c.pdfs.length; mi++) {
    const filename = c.pdfs[mi];
    const buf = readFileSync(join(PDF_DIR, filename));
    const path = safePath(chapter.id, filename);
    const { error: ue } = await db.storage
      .from("materials")
      .upload(path, buf, { contentType: "application/pdf", upsert: true });
    if (ue) throw new Error(`업로드 실패 (${filename}): ${ue.message}`);
    const { error: me } = await db.from("materials").insert({
      chapter_id: chapter.id,
      title: matTitle(filename),
      storage_path: path,
      size_bytes: buf.length,
      position: mi,
    });
    if (me) throw new Error(`자료 행 실패 (${filename}): ${me.message}`);
    totalMaterials++;
  }

  console.log(
    `✓ [${ci}] ${c.title} — 영상 ${c.videos.length}, 자료 ${c.pdfs.length}`,
  );
}

console.log(`\n완료: 챕터 ${CHAPTERS.length}, 영상 ${totalVideos}, 자료 ${totalMaterials}`);
