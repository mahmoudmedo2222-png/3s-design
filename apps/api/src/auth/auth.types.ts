export type AuthUser = {
  id: string;
  email: string;
  role: string;
};

export type RequestWithUser = {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthUser;
};
