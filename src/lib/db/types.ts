// DB 행 타입 (0001_init.sql 스키마와 일치)

export interface Student {
  id: string;
  phone: string;
  password_hash: string;
  name: string;
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

export interface Video {
  id: string;
  chapter_id: string;
  title: string | null;
  youtube_id: string;
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
