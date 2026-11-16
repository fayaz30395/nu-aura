import {beforeEach, describe, expect, it, vi} from 'vitest';
import {apiClient} from '../../api/client';
import {fluenceService} from './fluence.service';

vi.mock('../../api/client', () => ({
  apiClient: {post: vi.fn(), put: vi.fn()},
}));

describe('fluenceService wiki content serialization', () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockResolvedValue({data: {}});
    vi.mocked(apiClient.put).mockResolvedValue({data: {}});
  });

  it('sends content as a JSON string on create', async () => {
    const doc = {type: 'doc', content: []};
    await fluenceService.createWikiPage({title: 't', content: doc, spaceId: 's', visibility: 'PUBLIC'} as never);
    const body = vi.mocked(apiClient.post).mock.calls[0][1] as {content: unknown};
    expect(body.content).toBe(JSON.stringify(doc));
  });

  it('leaves content out of update when not provided', async () => {
    await fluenceService.updateWikiPage('1', {title: 'x'} as never);
    const body = vi.mocked(apiClient.put).mock.calls[0][1] as Record<string, unknown>;
    expect('content' in body).toBe(false);
  });
});
