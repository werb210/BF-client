export async function runSubmissionFlow(
  create: () => Promise<unknown>,
  upload: () => Promise<unknown>,
  submit: () => Promise<unknown>
): Promise<void> {
  await create();
  await upload();
  await submit();
}
