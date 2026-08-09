import z from "zod";

export const PaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export type Pagination = z.infer<typeof PaginationSchema>;

export const CommonServerResponseSchema = <T extends z.ZodTypeAny>(
  dataSchema: T
) =>
  z.object({
    success: z.boolean(),
    message: z.string(),
    data: dataSchema,
  });

export type CommonServerResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export const PaginatedServerResponseSchema = <T extends z.ZodTypeAny>(
  dataSchema: T
) =>
  z.object({
    success: z.boolean(),
    message: z.string(),
    data: z.array(dataSchema),
    pagination: PaginationSchema,
  });

export type PaginatedServerResponse<T> = {
  success: boolean;
  message: string;
  data: T[];
  pagination: Pagination;
};