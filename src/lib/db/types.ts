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
  youtube_id: string;
  material_url: string | null;
  duration_seconds: number | null;
  position: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Progress {
  student_id: string;
  chapter_id: string;
  watched_seconds: number;
  last_position: number;
  completed: boolean;
  completed_at: string | null;
  unlocked_override: boolean; // 교수진 수동 잠금 해제
  updated_at: string;
}
