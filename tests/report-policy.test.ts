import {describe,it,expect} from "vitest";
import {permittedTransitions} from "../src/lib/report-policy";
describe("cloud review permissions",()=>{
 it("requires an operator to advance work",()=>{
  expect(permittedTransitions("Submitted",true,false)).toEqual([]);
  expect(permittedTransitions("Submitted",false,true)).toEqual(["Acknowledged"]);
 });
 it("reserves confirmation and reopening for the reporting citizen",()=>{
  expect(permittedTransitions("Resolution proposed",false,true)).toEqual([]);
  expect(permittedTransitions("Resolution proposed",true,false)).toEqual(["Closed","Reopened"]);
  expect(permittedTransitions("Closed",true,false)).toEqual(["Reopened"]);
 });
 it("restores operator review after reopening",()=>{
  expect(permittedTransitions("Reopened",true,false)).toEqual([]);
  expect(permittedTransitions("Reopened",false,true)).toEqual(["Acknowledged"]);
 });
});
