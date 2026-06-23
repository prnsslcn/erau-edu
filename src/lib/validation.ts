import { z } from "zod";

// 전화번호: 숫자만 10~11자리 (하이픈 입력은 서버에서 제거 후 검증)
export const phoneSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .pipe(
    z
      .string()
      .regex(/^01\d{8,9}$/, "휴대폰 번호를 정확히 입력하세요 (예: 01012345678)"),
  );

// 학생 비밀번호: 숫자 4자리
export const studentPasswordSchema = z
  .string()
  .regex(/^\d{4}$/, "비밀번호는 숫자 4자리입니다");

export const studentSignupSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력하세요").max(40),
  phone: phoneSchema,
  password: studentPasswordSchema,
});

export const studentLoginSchema = z.object({
  phone: phoneSchema,
  password: studentPasswordSchema,
});

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("이메일 형식이 올바르지 않습니다"),
  password: z.string().min(1, "비밀번호를 입력하세요"),
});

// 강의 챕터 (Admin 생성/수정)
export const chapterSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력하세요").max(120),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  youtube_id: z
    .string()
    .trim()
    .min(1, "YouTube 영상 ID 또는 링크를 입력하세요"),
  material_url: z
    .string()
    .trim()
    .url("올바른 링크를 입력하세요")
    .optional()
    .or(z.literal("")),
  position: z.coerce.number().int().min(0),
  is_published: z.coerce.boolean().optional().default(false),
});

// 진도 업데이트 (영상 시청 하트비트)
export const progressUpdateSchema = z.object({
  chapter_id: z.string().uuid(),
  watched_seconds: z.coerce.number().int().min(0).max(100_000),
  last_position: z.coerce.number().int().min(0).max(100_000),
  duration: z.coerce.number().int().min(1).max(100_000),
});

export type StudentSignupInput = z.infer<typeof studentSignupSchema>;
export type ChapterInput = z.infer<typeof chapterSchema>;
