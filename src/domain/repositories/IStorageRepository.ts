export interface IStorageRepository {
  uploadVideo(file: File, gameId: string): Promise<string>  // returns bucket path
  getVideoUrl(path: string): string
  deleteVideo(path: string): Promise<void>
}
