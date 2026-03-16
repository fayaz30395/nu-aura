import { z } from 'zod';

// ─── Shared Field Schemas ───────────────────────────────────────────────────

const slugSchema = z
  .string()
  .min(1, 'Slug is required')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain only lowercase letters, numbers, and hyphens');

const optionalSlugSchema = z
  .string()
  .optional()
  .refine(
    (val) => !val || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(val),
    'Slug must contain only lowercase letters, numbers, and hyphens'
  );

const jsonContentSchema = z
  .record(z.any())
  .describe('JSON content (e.g., TipTap editor state)');

const uuidSchema = z.string().uuid('Invalid ID format');

const optionalUuidSchema = z
  .string()
  .optional()
  .refine(
    (val) => !val || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val),
    'Invalid ID format'
  );

const colorSchema = z
  .string()
  .optional()
  .refine(
    (val) => !val || /^#([0-9A-F]{3}){1,2}$/i.test(val),
    'Please provide a valid hex color'
  );

// ─── Enum Schemas ───────────────────────────────────────────────────────────

export const wikiPageStatusSchema = z.enum(
  ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
  { errorMap: () => ({ message: 'Please select a valid page status' }) }
);

export const wikiVisibilitySchema = z.enum(
  ['PUBLIC', 'ORGANIZATION', 'DEPARTMENT', 'PRIVATE', 'RESTRICTED'],
  { errorMap: () => ({ message: 'Please select a visibility level' }) }
);

export const blogPostStatusSchema = z.enum(
  ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
  { errorMap: () => ({ message: 'Please select a valid post status' }) }
);

export const blogVisibilitySchema = z.enum(
  ['PUBLIC', 'ORGANIZATION', 'DEPARTMENT', 'PRIVATE', 'RESTRICTED'],
  { errorMap: () => ({ message: 'Please select a visibility level' }) }
);

export const commentContentTypeSchema = z.enum(
  ['WIKI', 'BLOG'],
  { errorMap: () => ({ message: 'Invalid content type' }) }
);

// ─── Wiki Page Schemas ──────────────────────────────────────────────────────

export const createWikiPageSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title must not exceed 255 characters'),
  content: jsonContentSchema,
  spaceId: uuidSchema,
  parentId: optionalUuidSchema,
  visibility: wikiVisibilitySchema,
  status: wikiPageStatusSchema.optional().default('DRAFT'),
  departmentId: optionalUuidSchema,
  sharedWithDepartmentIds: z.array(z.string().uuid()).optional().default([]),
  sharedWithEmployeeIds: z.array(z.string().uuid()).optional().default([]),
});

export const updateWikiPageSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title must not exceed 255 characters')
    .optional(),
  content: jsonContentSchema.optional(),
  spaceId: uuidSchema.optional(),
  parentId: optionalUuidSchema,
  visibility: wikiVisibilitySchema.optional(),
  status: wikiPageStatusSchema.optional(),
});

export const createWikiSpaceSchema = z.object({
  name: z
    .string()
    .min(1, 'Space name is required')
    .min(3, 'Space name must be at least 3 characters')
    .max(100, 'Space name must not exceed 100 characters'),
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
  icon: z.string().optional(),
  color: colorSchema,
  visibility: wikiVisibilitySchema,
});

export const updateWikiSpaceSchema = z.object({
  name: z
    .string()
    .min(3, 'Space name must be at least 3 characters')
    .max(100, 'Space name must not exceed 100 characters')
    .optional(),
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
  icon: z.string().optional(),
  color: colorSchema,
  visibility: wikiVisibilitySchema.optional(),
});

// ─── Blog Post Schemas ───────────────────────────────────────────────────────

export const createBlogPostSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title must not exceed 255 characters'),
  content: jsonContentSchema,
  excerpt: z
    .string()
    .min(10, 'Excerpt must be at least 10 characters')
    .max(500, 'Excerpt must not exceed 500 characters'),
  categoryId: optionalUuidSchema,
  tags: z
    .array(z.string().min(1).max(50))
    .optional()
    .default([]),
  visibility: blogVisibilitySchema,
  coverImageUrl: z
    .string()
    .url('Invalid cover image URL')
    .optional(),
  status: blogPostStatusSchema.optional().default('DRAFT'),
  departmentId: optionalUuidSchema,
  sharedWithDepartmentIds: z.array(z.string().uuid()).optional().default([]),
  sharedWithEmployeeIds: z.array(z.string().uuid()).optional().default([]),
});

export const updateBlogPostSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title must not exceed 255 characters')
    .optional(),
  content: jsonContentSchema.optional(),
  excerpt: z
    .string()
    .min(10, 'Excerpt must be at least 10 characters')
    .max(500, 'Excerpt must not exceed 500 characters')
    .optional(),
  categoryId: optionalUuidSchema,
  tags: z
    .array(z.string().min(1).max(50))
    .optional(),
  visibility: blogVisibilitySchema.optional(),
  coverImageUrl: z
    .string()
    .url('Invalid cover image URL')
    .optional(),
  status: blogPostStatusSchema.optional(),
});

export const createBlogCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .min(3, 'Category name must be at least 3 characters')
    .max(100, 'Category name must not exceed 100 characters'),
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
  color: colorSchema,
});

// ─── Template Schemas ────────────────────────────────────────────────────────

export const createTemplateSchema = z.object({
  name: z
    .string()
    .min(1, 'Template name is required')
    .min(3, 'Template name must be at least 3 characters')
    .max(255, 'Template name must not exceed 255 characters'),
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
  content: jsonContentSchema,
  categoryId: optionalUuidSchema,
  tags: z
    .array(z.string().min(1).max(50))
    .optional()
    .default([]),
  icon: z.string().optional(),
});

export const updateTemplateSchema = z.object({
  name: z
    .string()
    .min(3, 'Template name must be at least 3 characters')
    .max(255, 'Template name must not exceed 255 characters')
    .optional(),
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
  content: jsonContentSchema.optional(),
  categoryId: optionalUuidSchema,
  tags: z
    .array(z.string().min(1).max(50))
    .optional(),
  icon: z.string().optional(),
});

export const instantiateTemplateSchema = z.object({
  templateId: uuidSchema,
  documentTitle: z
    .string()
    .min(1, 'Document title is required')
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title must not exceed 255 characters'),
  spaceId: optionalUuidSchema,
});

// ─── Comment Schemas ────────────────────────────────────────────────────────

export const createCommentSchema = z.object({
  body: z
    .string()
    .min(1, 'Comment is required')
    .min(2, 'Comment must be at least 2 characters')
    .max(2000, 'Comment must not exceed 2000 characters'),
  parentId: optionalUuidSchema,
});

export const updateCommentSchema = z.object({
  body: z
    .string()
    .min(2, 'Comment must be at least 2 characters')
    .max(2000, 'Comment must not exceed 2000 characters'),
});

// ─── Search Schemas ─────────────────────────────────────────────────────────

export const fluenceSearchSchema = z.object({
  query: z
    .string()
    .min(1, 'Search query is required')
    .min(2, 'Search query must be at least 2 characters')
    .max(200, 'Search query must not exceed 200 characters'),
  type: commentContentTypeSchema.optional(),
  page: z.number().int().min(0).optional().default(0),
  size: z.number().int().min(1).max(100).optional().default(20),
});

// Type exports for convenience
export type CreateWikiPageSchema = z.infer<typeof createWikiPageSchema>;
export type UpdateWikiPageSchema = z.infer<typeof updateWikiPageSchema>;
export type CreateBlogPostSchema = z.infer<typeof createBlogPostSchema>;
export type UpdateBlogPostSchema = z.infer<typeof updateBlogPostSchema>;
export type CreateTemplateSchema = z.infer<typeof createTemplateSchema>;
export type CreateCommentSchema = z.infer<typeof createCommentSchema>;
export type FluenceSearchSchema = z.infer<typeof fluenceSearchSchema>;
