import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:4000/api';
const emailSuffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
const email = `auth-test+${emailSuffix}@example.com`;
const fullName = 'Auth Regression User';
const initialPassword = 'StrongPass1234';
const resetPassword = 'AnotherStrong123';

type AuthResponse = {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    isEmailVerified: boolean;
  };
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  emailVerificationRequired?: boolean;
  devEmailVerificationToken?: string;
};

type PasswordResetResponse = {
  sent: true;
  devPasswordResetToken?: string;
};

async function request(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);

  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  return fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
  });
}

async function json<T>(response: Response) {
  const body = (await response.text()) || '{}';

  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error(`Expected JSON response, got status ${response.status}: ${body}`);
  }
}

async function postJson<T>(path: string, body: unknown, token?: string) {
  const headers: Record<string, string> = {};

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const response = await request(path, {
    method: 'POST',
    body: JSON.stringify(body),
    headers,
  });

  return { response, body: await json<T>(response) };
}

async function expectFailure(path: string, body: unknown, expectedStatuses: number[]) {
  const { response } = await postJson(path, body);
  assert.ok(
    expectedStatuses.includes(response.status),
    `Expected ${path} to fail with ${expectedStatuses.join(' or ')}, got ${response.status}`,
  );
}

void test('auth regression: register, login, refresh rotation, reuse detection, logout, reset, lockout', async (t) => {
  let registered!: AuthResponse;
  let loggedIn!: AuthResponse;

  await t.test('register rejects weak passwords', async () => {
    for (const password of ['Short1', 'lowercase1234', 'UPPERCASE1234', 'NoNumberPassword']) {
      await expectFailure(
        '/auth/register',
        {
          email: `weak-${randomUUID()}@example.com`,
          fullName,
          password,
        },
        [400],
      );
    }
  });

  await t.test('register returns tokens and /me accepts access token', async () => {
    const { response, body } = await postJson<AuthResponse>('/auth/register', {
      email,
      fullName,
      password: initialPassword,
    });

    assert.ok(response.ok, `Expected register to succeed, got ${response.status}`);
    assert.equal(body.user.email, email);
    assert.ok(body.accessToken);
    assert.ok(body.refreshToken);
    assert.ok(body.refreshTokenExpiresAt);

    const meResponse = await request('/auth/me', {
      headers: { authorization: `Bearer ${body.accessToken}` },
    });
    assert.ok(meResponse.ok, `Expected /me to succeed, got ${meResponse.status}`);

    registered = body;
  });

  await t.test('email verification token is single-use when dev token is exposed', async (t) => {
    const verificationToken = registered.devEmailVerificationToken;

    if (!verificationToken) {
      t.skip('Dev email verification token is not exposed by this environment.');
      return;
    }

    const verified = await postJson<{ verified: true }>('/auth/email/verify', {
      token: verificationToken,
    });
    assert.ok(verified.response.ok, `Expected email verify to succeed, got ${verified.response.status}`);
    assert.equal(verified.body.verified, true);

    await expectFailure('/auth/email/verify', { token: verificationToken }, [401]);
  });

  await t.test('login returns fresh session tokens', async () => {
    const { response, body } = await postJson<AuthResponse>('/auth/login', {
      email,
      password: initialPassword,
    });

    assert.ok(response.ok, `Expected login to succeed, got ${response.status}`);
    assert.ok(body.accessToken);
    assert.ok(body.refreshToken);
    assert.notEqual(body.refreshToken, registered.refreshToken);

    loggedIn = body;
  });

  await t.test('refresh rotates tokens and reused refresh token revokes the session family', async () => {
    const firstRefresh = await postJson<AuthResponse>('/auth/refresh', {
      refreshToken: loggedIn.refreshToken,
    });
    assert.ok(firstRefresh.response.ok, `Expected refresh to succeed, got ${firstRefresh.response.status}`);
    assert.ok(firstRefresh.body.accessToken);
    assert.ok(firstRefresh.body.refreshToken);
    assert.notEqual(firstRefresh.body.refreshToken, loggedIn.refreshToken);

    await expectFailure('/auth/refresh', { refreshToken: loggedIn.refreshToken }, [401]);
    await expectFailure('/auth/refresh', { refreshToken: firstRefresh.body.refreshToken }, [401]);
  });

  await t.test('logout revokes current refresh token', async () => {
    const session = await postJson<AuthResponse>('/auth/login', {
      email,
      password: initialPassword,
    });
    assert.ok(session.response.ok, `Expected login to succeed, got ${session.response.status}`);

    const logout = await postJson<{ loggedOut: true }>('/auth/logout', {
      refreshToken: session.body.refreshToken,
    });
    assert.ok(logout.response.ok, `Expected logout to succeed, got ${logout.response.status}`);
    assert.equal(logout.body.loggedOut, true);

    await expectFailure('/auth/refresh', { refreshToken: session.body.refreshToken }, [401]);
  });

  await t.test('logout-all revokes all refresh tokens for the user', async () => {
    const sessionA = await postJson<AuthResponse>('/auth/login', {
      email,
      password: initialPassword,
    });
    const sessionB = await postJson<AuthResponse>('/auth/login', {
      email,
      password: initialPassword,
    });

    assert.ok(sessionA.response.ok, `Expected login A to succeed, got ${sessionA.response.status}`);
    assert.ok(sessionB.response.ok, `Expected login B to succeed, got ${sessionB.response.status}`);

    const logoutAll = await postJson<{ loggedOut: true }>('/auth/logout-all', {}, sessionA.body.accessToken);
    assert.ok(logoutAll.response.ok, `Expected logout-all to succeed, got ${logoutAll.response.status}`);
    assert.equal(logoutAll.body.loggedOut, true);

    await expectFailure('/auth/refresh', { refreshToken: sessionA.body.refreshToken }, [401]);
    await expectFailure('/auth/refresh', { refreshToken: sessionB.body.refreshToken }, [401]);
  });

  await t.test('password reset enforces strong passwords and revokes previous sessions when dev token is exposed', async (t) => {
    const activeSession = await postJson<AuthResponse>('/auth/login', {
      email,
      password: initialPassword,
    });
    assert.ok(activeSession.response.ok, `Expected login to succeed, got ${activeSession.response.status}`);

    const resetRequest = await postJson<PasswordResetResponse>('/auth/password/reset/request', { email });
    assert.ok(resetRequest.response.ok, `Expected reset request to succeed, got ${resetRequest.response.status}`);

    const resetToken = resetRequest.body.devPasswordResetToken;

    if (!resetToken) {
      t.skip('Dev password reset token is not exposed by this environment.');
      return;
    }

    await expectFailure(
      '/auth/password/reset',
      {
        token: resetToken,
        password: 'weak-password',
      },
      [400],
    );

    const secondResetRequest = await postJson<PasswordResetResponse>('/auth/password/reset/request', { email });
    assert.ok(secondResetRequest.response.ok, `Expected second reset request to succeed, got ${secondResetRequest.response.status}`);
    assert.ok(secondResetRequest.body.devPasswordResetToken);

    const reset = await postJson<{ reset: true }>('/auth/password/reset', {
      token: secondResetRequest.body.devPasswordResetToken,
      password: resetPassword,
    });
    assert.ok(reset.response.ok, `Expected password reset to succeed, got ${reset.response.status}`);
    assert.equal(reset.body.reset, true);

    await expectFailure('/auth/login', { email, password: initialPassword }, [401]);

    const newLogin = await postJson<AuthResponse>('/auth/login', {
      email,
      password: resetPassword,
    });
    assert.ok(newLogin.response.ok, `Expected login with reset password to succeed, got ${newLogin.response.status}`);

    await expectFailure('/auth/refresh', { refreshToken: activeSession.body.refreshToken }, [401]);
  });

  await t.test('login locks after repeated failures', async () => {
    const lockoutEmail = `lockout-${emailSuffix}@example.com`;
    const register = await postJson<AuthResponse>('/auth/register', {
      email: lockoutEmail,
      fullName: 'Lockout Test User',
      password: initialPassword,
    });
    assert.ok(register.response.ok, `Expected lockout test user registration to succeed, got ${register.response.status}`);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expectFailure('/auth/login', { email: lockoutEmail, password: 'WrongPassword123' }, [401]);
    }

    await expectFailure('/auth/login', { email: lockoutEmail, password: 'WrongPassword123' }, [429]);
    await expectFailure('/auth/login', { email: lockoutEmail, password: initialPassword }, [429]);
  });
});
