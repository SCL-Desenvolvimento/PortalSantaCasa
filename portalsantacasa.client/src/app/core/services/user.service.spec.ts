import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserService } from './user.service';
import { User } from '../../models/user.model';
import { environment } from '../../../environments/environment';

describe('UserService', () => {
  let service: UserService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/user`;
  const user: User = { id: 12, username: 'Maria', email: 'maria@example.com', userType: 'viewer', department: 'TI', isActive: true, createdAt: '2026-11-10T10:00:00Z', photoUrl: '/images/maria.png' };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(UserService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('trims and encodes people queries', () => {
    service.searchUsers('  Maria & Ana  ').subscribe(users => expect(users).toEqual([user]));
    http.expectOne(`${base}/search?q=Maria%20%26%20Ana`).flush([user]);
  });
  it('requests the default and selected management page', () => {
    for (const page of [undefined, 3]) {
      service.getUsersPaginated(page, page === undefined ? undefined : 25).subscribe(result => expect(result.users).toEqual([user]));
      http.expectOne(`${base}/paginated?page=${page === undefined ? 1 : 3}&perPage=${page === undefined ? 10 : 25}`).flush({ currentPage: page ?? 1, perPage: 25, pages: 4, users: [user] });
    }
  });
  it('publishes the saved profile only after the API confirms the multipart update', () => {
    const changes: User[] = [];
    service.profileUpdated$.subscribe(value => changes.push(value));
    const profile = new FormData();
    profile.append('username', 'Maria');
    profile.append('photo', new File(['image'], 'maria.png', { type: 'image/png' }));
    service.updateCurrentProfile(profile).subscribe(value => expect(value).toEqual(user));
    const request = http.expectOne(`${base}/me`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toBe(profile);
    expect(changes).toEqual([]);
    request.flush(user);
    expect(changes).toEqual([user]);
  });
  it('does not publish a profile update rejected by the server', () => {
    const changes: User[] = [];
    service.profileUpdated$.subscribe(value => changes.push(value));
    let error: Error | undefined;
    service.updateCurrentProfile(new FormData()).subscribe({ error: failure => error = failure });
    http.expectOne(`${base}/me`).flush({ message: 'Email inválido' }, { status: 400, statusText: 'Bad Request' });
    expect(error?.message).toBe('Email inválido');
    expect(changes).toEqual([]);
  });
  it('requires the current password when changing the signed-in user password', () => {
    service.changeOwnPassword('current', 'new-secret').subscribe(value => expect(value).toEqual({ message: 'Alterada' }));
    const request = http.expectOne(`${base}/me/change-password`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ currentPassword: 'current', newPassword: 'new-secret' });
    request.flush({ message: 'Alterada' });
  });
  it('sends an explicit temporary bearer token to the initial password endpoint', () => {
    service.changeInitialPassword('new-secret', 'first-access').subscribe(value => expect(value.message).toBe('Alterada'));
    const request = http.expectOne(`${environment.apiUrl}/auth/change-password`);
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe('Bearer first-access');
    expect(request.request.body).toEqual({ newPassword: 'new-secret' });
    request.flush({ message: 'Alterada' });
  });
  for (const token of [undefined, 'temporary']) {
    it(`changes the target user password ${token ? 'using the provided bearer token' : 'using the current session'}`, () => {
      service.changePassword(12, 'new-secret', token).subscribe();
      const request = http.expectOne(`${base}/12/change-password`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ newPassword: 'new-secret' });
      expect(request.request.headers.get('Authorization')).toBe(token ? 'Bearer temporary' : null);
      request.flush({ message: 'Alterada' });
    });
  }
  it('keeps the full directory and current profile endpoints distinct from management users', () => {
    service.getUser().subscribe(users => expect(users).toEqual([user]));
    http.expectOne(`${base}/all`).flush([user]);
    service.getDirectory().subscribe(users => expect(users).toEqual([user]));
    http.expectOne(`${base}/directory`).flush([user]);
    service.getUserById(12).subscribe(value => expect(value).toEqual(user));
    http.expectOne(`${base}/12`).flush(user);
    service.getCurrentProfile().subscribe(value => expect(value).toEqual(user));
    http.expectOne(`${base}/me`).flush(user);
  });
  it('creates and updates users with multipart bodies and removes only the selected user', () => {
    const form = new FormData();
    form.append('username', 'Maria');
    service.createUser(form).subscribe(value => expect(value).toEqual(user));
    const create = http.expectOne(base);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toBe(form);
    create.flush(user);
    service.updateUser(12, form).subscribe(value => expect(value).toEqual(user));
    const update = http.expectOne(`${base}/12`);
    expect(update.request.method).toBe('PUT');
    expect(update.request.body).toBe(form);
    update.flush(user);
    service.deleteUser(12).subscribe();
    const deletion = http.expectOne(`${base}/12`);
    expect(deletion.request.method).toBe('DELETE');
    deletion.flush(null);
  });
  it('resets only the selected user password using an empty body', () => {
    service.resetPassword(12).subscribe();
    const request = http.expectOne(`${base}/reset-password/12`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush(null);
  });
  for (const fixture of [
    { body: { message: 'Mensagem específica', error: 'Fallback' }, message: 'Mensagem específica' },
    { body: { error: 'Erro específico' }, message: 'Erro específico' },
    { body: null, message: 'Ocorreu um erro. Tente novamente mais tarde.' }
  ]) {
    it(`normalizes API failures to ${fixture.message}`, () => {
      let error: Error | undefined;
      service.getCurrentProfile().subscribe({ error: failure => error = failure });
      http.expectOne(`${base}/me`).flush(fixture.body, { status: 400, statusText: 'Bad Request' });
      expect(error?.message).toBe(fixture.message);
    });
  }
  it('normalizes a browser network error', () => {
    let error: Error | undefined;
    service.getCurrentProfile().subscribe({ error: failure => error = failure });
    http.expectOne(`${base}/me`).error(new ErrorEvent('error', { message: 'Network offline' }));
    expect(error?.message).toBe('Erro: Network offline');
  });
});
