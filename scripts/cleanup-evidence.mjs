// Scheduled maintenance for abandoned upload reservations; ready evidence is immutable.
import { createClient } from "@supabase/supabase-js";
const url=process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SECRET_KEY;
if(!url || !key) throw Error("Server-only Supabase configuration is required.");
const client=createClient(url,key,{auth:{persistSession:false}});
const cutoff=new Date(Date.now()-86400000).toISOString();
const {data,error}=await client.from("civic_evidence").select("id,object_path").eq("status","pending").lt("created_at",cutoff).limit(100);
if(error) throw Error("Could not read abandoned upload reservations.");
let removed=0;
for(const item of data) {
 const object=await client.storage.from("civic-evidence").remove([item.object_path]);
 if(object.error) throw Error("Could not remove an abandoned upload; metadata was retained.");
 const row=await client.from("civic_evidence").delete().eq("id",item.id).eq("status","pending").lt("created_at",cutoff);
 if(row.error) throw Error("Could not remove expired reservation metadata.");
 removed++;
}
console.log(JSON.stringify({abandonedReservationsRemoved:removed,readyEvidenceUntouched:true}));
