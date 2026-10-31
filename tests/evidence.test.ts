import {describe,it,expect} from "vitest";
import {validEvidenceBytes,boundedFormData} from "../src/lib/evidence";
describe("private evidence validation",()=>{
 it("rejects mislabeled images and executable content",()=>{
  expect(validEvidenceBytes("image/png",Buffer.from("<svg onload='alert(1)'/>"))).toBe(false);
  expect(validEvidenceBytes("image/webp",Buffer.from("FAKE1234WEBP"))).toBe(false);
  expect(validEvidenceBytes("image/jpeg",Buffer.from([255,216,0]))).toBe(false);
 });
 it("recognizes the supported audio container headers",()=>{
  expect(validEvidenceBytes("audio/webm",Buffer.from([26,69,223,163]))).toBe(true);
  expect(validEvidenceBytes("audio/ogg",Buffer.from("OggS"))).toBe(true);
  expect(validEvidenceBytes("audio/wav",Buffer.from("RIFF1234WAVE"))).toBe(true);
  expect(validEvidenceBytes("audio/mp4",Buffer.from("1234ftyp"))).toBe(true);
  expect(validEvidenceBytes("audio/mpeg",Buffer.from("ID3"))).toBe(true);
 });
 it("rejects missing and oversized evidence",()=>{
  expect(validEvidenceBytes("image/png",new Uint8Array())).toBe(false);
  expect(validEvidenceBytes("audio/ogg",new Uint8Array(5242881))).toBe(false);
 });
 it("limits streamed bodies even without Content-Length",async()=>{
  const stream=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(6*1024*1024+1));controller.close();}});
  await expect(boundedFormData(new Request("http://localhost/upload",{method:"POST",body:stream,duplex:"half"} as RequestInit))).rejects.toThrow("Upload too large");
 });
});
