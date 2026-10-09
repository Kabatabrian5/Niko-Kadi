/// <reference types="vite/client" />

declare module '*.jpg' {
  const imageUrl: string;
  export default imageUrl;
}