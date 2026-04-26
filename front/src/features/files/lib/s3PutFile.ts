export const s3PutFile = async (url: string, file: File, contentType: string): Promise<void> => {
  const res: Response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });
  if (!res.ok) {
    const text = await res.text().catch((): string => '');
    throw new Error(`S3 upload failed (${res.status}): ${text || res.statusText}`);
  }
};
