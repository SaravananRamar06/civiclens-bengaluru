import {createClient} from "@supabase/supabase-js";
import {createGunzip} from "node:zlib";
import {Readable} from "node:stream";
import {parse} from "csv-parse";
const url=process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SECRET_KEY;
if(!url || !key) throw Error("A server-only Supabase key is required for the official archive import.");
const client=createClient(url,key,{auth:{persistSession:false}});
const source="https://raw.githubusercontent.com/Vonter/bbmp-citizen-grievances/main/data/citizen-grievances.csv.gz";
const response=await fetch(source);
if(!response.ok || !response.body) throw Error("Real source dataset could not be fetched.");
const parser=Readable.fromWeb(response.body).pipe(createGunzip()).pipe(parse({columns:true,bom:true,relax_column_count:true}));
let batch=[], count=0; const fetched_at=new Date().toISOString();
async function flush() { if(!batch.length)return; const {error}=await client.from("civic_sources").upsert(batch,{onConflict:"id"}); if(error)throw Error("Cloud source import failed; already imported batches remain saved."); batch=[]; }
for await(const row of parser) {
 if(!row["Complaint ID"])continue;
 batch.push({id:String(row["Complaint ID"]),category:row.Category||"Other",detail:row["Sub Category"]||"Unspecified",ward:row["Ward Name"]||"Unavailable",reported_at:row["Grievance Date"]||"",source_status:row["Grievance Status"]||"Unknown",source_url:"https://github.com/Vonter/bbmp-citizen-grievances",fetched_at});
 count++; if(batch.length>=250) await flush();
 if(count>=5000) {parser.destroy();break;}
}
await flush(); console.log(JSON.stringify({imported:count,source,fetchedAt:fetched_at}));
