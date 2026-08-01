import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../repositories/profileRepository', () => ({
  profileRepository: {
    findById: vi.fn(),
    findByUsername: vi.fn(),
    findByIds: vi.fn(),
    search: vi.fn(),
    update: vi.fn(),
  },
}));

const { profileRepository } = await import('../repositories/profileRepository');
const { profileService } = await import('./profileService');

function makeProfile(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'u1',
    username: 'alice',
    displayName: null,
    avatarUrl: null,
    bio: null,
    usernameChanged: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('profileService passthrough reads', () => {
  it('delegates getOwnProfile / getById to findById', async () => {
    vi.mocked(profileRepository.findById).mockResolvedValue(makeProfile());
    const own = await profileService.getOwnProfile('u1');
    const byId = await profileService.getById('u1');
    expect(profileRepository.findById).toHaveBeenCalledTimes(2);
    expect(profileRepository.findById).toHaveBeenCalledWith('u1');
    expect(own?.username).toBe('alice');
    expect(byId?.username).toBe('alice');
  });

  it('delegates getByUsername', async () => {
    vi.mocked(profileRepository.findByUsername).mockResolvedValue(makeProfile());
    const result = await profileService.getByUsername('alice');
    expect(profileRepository.findByUsername).toHaveBeenCalledWith('alice');
    expect(result?.id).toBe('u1');
  });

  it('delegates getByIds', async () => {
    vi.mocked(profileRepository.findByIds).mockResolvedValue([makeProfile()]);
    const result = await profileService.getByIds(['u1']);
    expect(profileRepository.findByIds).toHaveBeenCalledWith(['u1']);
    expect(result).toHaveLength(1);
  });

  it('delegates search', async () => {
    vi.mocked(profileRepository.search).mockResolvedValue([makeProfile()]);
    const result = await profileService.search('ali');
    expect(profileRepository.search).toHaveBeenCalledWith('ali');
    expect(result).toHaveLength(1);
  });
});

describe('profileService.updateOwnProfile', () => {
  it('allows updating fields without touching the username (no profile fetch needed)', async () => {
    vi.mocked(profileRepository.update).mockResolvedValue(makeProfile({ displayName: 'Alice' }));

    await profileService.updateOwnProfile('u1', { displayName: 'Alice' });

    expect(profileRepository.findById).not.toHaveBeenCalled();
    expect(profileRepository.update).toHaveBeenCalledWith('u1', { displayName: 'Alice' });
  });

  it('allows keeping the same username even after it was already changed once', async () => {
    vi.mocked(profileRepository.findById).mockResolvedValue(
      makeProfile({ username: 'alice', usernameChanged: true }),
    );
    vi.mocked(profileRepository.update).mockResolvedValue(makeProfile());

    await profileService.updateOwnProfile('u1', { username: 'alice' });

    expect(profileRepository.update).toHaveBeenCalledWith('u1', { username: 'alice' });
  });

  it('allows changing the username the first time (usernameChanged false)', async () => {
    vi.mocked(profileRepository.findById).mockResolvedValue(
      makeProfile({ username: 'alice', usernameChanged: false }),
    );
    vi.mocked(profileRepository.update).mockResolvedValue(makeProfile({ username: 'alice_new' }));

    await profileService.updateOwnProfile('u1', { username: 'alice_new' });

    expect(profileRepository.update).toHaveBeenCalledWith('u1', { username: 'alice_new' });
  });

  it('rejects changing the username a second time after it was already changed', async () => {
    vi.mocked(profileRepository.findById).mockResolvedValue(
      makeProfile({ username: 'alice', usernameChanged: true }),
    );

    await expect(profileService.updateOwnProfile('u1', { username: 'alice_new' })).rejects.toThrow(
      'Username can only be changed once.',
    );
    expect(profileRepository.update).not.toHaveBeenCalled();
  });
});
