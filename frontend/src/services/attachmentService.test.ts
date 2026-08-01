import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../repositories/issueRepository', () => ({
  issueRepository: {
    findAttachments: vi.fn(),
    addAttachment: vi.fn(),
    removeAttachment: vi.fn(),
  },
}));
vi.mock('../repositories/entityAttachmentRepository', () => ({
  entityAttachmentRepository: {
    findForEntity: vi.fn(),
    create: vi.fn(),
    remove: vi.fn(),
  },
}));
vi.mock('./storage', () => ({
  storageAdapter: {
    providerName: 'supabase',
    upload: vi.fn(),
    remove: vi.fn(),
  },
}));

const { issueRepository } = await import('../repositories/issueRepository');
const { entityAttachmentRepository } = await import('../repositories/entityAttachmentRepository');
const { storageAdapter } = await import('./storage');
const { attachmentService } = await import('./attachmentService');

const file = new File(['content'], 'screenshot.png', { type: 'image/png' });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('attachmentService.listByIssue', () => {
  it('delegates to issueRepository.findAttachments', async () => {
    vi.mocked(issueRepository.findAttachments).mockResolvedValue([{ id: 'att-1' } as never]);
    const result = await attachmentService.listByIssue('issue-1');
    expect(issueRepository.findAttachments).toHaveBeenCalledWith('issue-1');
    expect(result).toHaveLength(1);
  });
});

describe('attachmentService.listForEntity', () => {
  it('delegates to entityAttachmentRepository.findForEntity', async () => {
    vi.mocked(entityAttachmentRepository.findForEntity).mockResolvedValue([{ id: 'att-2' } as never]);
    const result = await attachmentService.listForEntity('test_case', 'tc-1');
    expect(entityAttachmentRepository.findForEntity).toHaveBeenCalledWith('test_case', 'tc-1');
    expect(result).toHaveLength(1);
  });
});

describe('attachmentService.upload', () => {
  it('uploads through the storage adapter then records the attachment with the provider name', async () => {
    vi.mocked(storageAdapter.upload).mockResolvedValue({
      url: 'https://cdn/1.png',
      fileName: 'screenshot.png',
      fileSize: 42,
      contentType: 'image/png',
    });
    vi.mocked(issueRepository.addAttachment).mockResolvedValue({ id: 'att-1' } as never);

    const result = await attachmentService.upload('issue-1', 'proj-1', file);

    expect(storageAdapter.upload).toHaveBeenCalledWith(file);
    expect(issueRepository.addAttachment).toHaveBeenCalledWith({
      issueId: 'issue-1',
      projectId: 'proj-1',
      storageProvider: 'supabase',
      url: 'https://cdn/1.png',
      fileName: 'screenshot.png',
      fileSize: 42,
      contentType: 'image/png',
    });
    expect(result).toEqual({ id: 'att-1' });
  });
});

describe('attachmentService.remove', () => {
  it('removes from storage first, then from the issue repository', async () => {
    vi.mocked(storageAdapter.remove).mockResolvedValue(undefined);
    vi.mocked(issueRepository.removeAttachment).mockResolvedValue(undefined);

    await attachmentService.remove('att-1', 'https://cdn/1.png');

    const order = [
      storageAdapter.remove.mock.invocationCallOrder[0],
      issueRepository.removeAttachment.mock.invocationCallOrder[0],
    ];
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(storageAdapter.remove).toHaveBeenCalledWith('https://cdn/1.png');
    expect(issueRepository.removeAttachment).toHaveBeenCalledWith('att-1');
  });
});

describe('attachmentService.uploadForEntity / removeForEntity', () => {
  it('records an entity-agnostic attachment after uploading', async () => {
    vi.mocked(storageAdapter.upload).mockResolvedValue({
      url: 'https://cdn/2.png',
      fileName: 'shot.png',
      fileSize: 7,
      contentType: 'image/png',
    });
    vi.mocked(entityAttachmentRepository.create).mockResolvedValue({ id: 'att-2' } as never);

    await attachmentService.uploadForEntity('test_case', 'tc-1', 'proj-1', file);

    expect(entityAttachmentRepository.create).toHaveBeenCalledWith({
      entityType: 'test_case',
      entityId: 'tc-1',
      projectId: 'proj-1',
      storageProvider: 'supabase',
      url: 'https://cdn/2.png',
      fileName: 'shot.png',
      fileSize: 7,
      contentType: 'image/png',
    });
  });

  it('removes entity-agnostic attachments from storage first, then the repository', async () => {
    vi.mocked(storageAdapter.remove).mockResolvedValue(undefined);
    vi.mocked(entityAttachmentRepository.remove).mockResolvedValue(undefined);

    await attachmentService.removeForEntity('att-2', 'https://cdn/2.png');

    expect(storageAdapter.remove).toHaveBeenCalledWith('https://cdn/2.png');
    expect(entityAttachmentRepository.remove).toHaveBeenCalledWith('att-2');
  });
});
