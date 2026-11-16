-- Alpha file mapping so /api/v1/files/download guard has a real tenant-owned object to protect. Fake drive id (no Drive call is made by the guard path).
INSERT INTO drive_file_mapping (id, tenant_id, object_name, drive_file_id, created_at)
VALUES ('a1fa0000-0000-4000-8000-000000000a61', 'a1fa0000-0000-4000-8000-00000000a1fa',
        'a1fa0000-0000-4000-8000-00000000a1fa/documents/a1fa0000-0000-4000-8000-000000000a01/NUAURA_TEST_alpha-secret.txt', 'NUAURA_TEST_fake_drive_id', now())
ON CONFLICT (id) DO NOTHING;
UPDATE file_metadata SET storage_path='a1fa0000-0000-4000-8000-00000000a1fa/documents/a1fa0000-0000-4000-8000-000000000a01/NUAURA_TEST_alpha-secret.txt'
WHERE id='a1fa0000-0000-4000-8000-000000000a60';
