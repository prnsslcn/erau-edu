// DB 행 타입 (0001_init.sql 스키마와 일치)

export interface Student {
  id: string;
  phone: string;
  password_hash: string;
  name: string;
  approved: boolean;
  approved_at: string | null;
  created_at: string;
}

export interface Admin {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: string;
}

export interface Chapter {
  id: string;
  title: string;
  description: string | null;
  position: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

// 영상 출처 — 'youtube'는 미등록 영상 임베드, 'bunny'는 교수가 직접 업로드한 파일
export type VideoSource = "youtube" | "bunny";

export interface Video {
  id: string;
  chapter_id: string;
  title: string | null;
  source: VideoSource;
  youtube_id: string | null; // source='youtube' 일 때만
  asset_id: string | null; // source='bunny' 일 때 Bunny Stream GUID
  duration_seconds: number | null;
  position: number;
  created_at: string;
}

export interface Material {
  id: string;
  chapter_id: string;
  title: string;
  storage_path: string;
  size_bytes: number | null;
  position: number;
  created_at: string;
}

export interface VideoProgress {
  student_id: string;
  video_id: string;
  watched_seconds: number;
  last_position: number;
  completed: boolean;
  completed_at: string | null;
  updated_at: string;
}

export interface ChapterUnlock {
  student_id: string;
  chapter_id: string;
  unlocked_override: boolean;
  updated_at: string;
}
