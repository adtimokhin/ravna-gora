export type Issue = {
  id: string;
  issue_number: number;
  issue_date: string;
  slug: string;
  cover_image_url: string | null;
  pdf_object_key: string;
  title: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: string;
  banned: boolean;
  createdAt: string;
  lastSignInAt: string | null;
};
