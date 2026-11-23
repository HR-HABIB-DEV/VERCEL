const allowed = new Set(["youtube.com","www.youtube.com","m.youtube.com","youtu.be","music.youtube.com","facebook.com","www.facebook.com","m.facebook.com","fb.watch","instagram.com","www.instagram.com","pinterest.com","www.pinterest.com","pin.it"]);
const reply=(res,status,data)=>{res.statusCode=status;res.setHeader("Content-Type","application/json");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(data));};
module.exports=async(req,res)=>{
 if(req.method!=="POST")return reply(res,405,{ok:false,error:"Use POST."});
 let u;try{u=new URL(req.body?.url||"")}catch{return reply(res,400,{ok:false,error:"Invalid URL."})}
 if(u.protocol!=="https:"||!allowed.has(u.hostname.toLowerCase()))return reply(res,400,{ok:false,error:"Use a supported HTTPS YouTube, Facebook, Instagram or Pinterest link."});
 const base=(process.env.COBALT_API_URL||"").trim();if(!base)return reply(res,503,{ok:false,error:"COBALT_API_URL is not configured in Vercel Environment Variables."});
 const endpoint=base.replace(/\/+$/,"")+"/";
 const headers={"Content-Type":"application/json","Accept":"application/json"};
 if(process.env.COBALT_API_KEY)headers.Authorization="Api-Key "+process.env.COBALT_API_KEY;
 try{
  const upstream=await fetch(endpoint,{method:"POST",headers,body:JSON.stringify({url:u.toString(),downloadMode:req.body?.mode==="audio"?"audio":"auto",audioFormat:"mp3",audioBitrate:"320",videoQuality:String(req.body?.quality||"max"),filenameStyle:"pretty",youtubeVideoContainer:"mp4"}),signal:AbortSignal.timeout(25000)});
  const data=await upstream.json().catch(()=>({}));
  if(!upstream.ok||data.status==="error")return reply(res,502,{ok:false,error:data.error?.code||"Download provider rejected the request."});
  if((data.status==="tunnel"||data.status==="redirect")&&data.url)return reply(res,200,{ok:true,url:data.url,filename:data.filename||"download"});
  if(data.status==="picker")return reply(res,200,{ok:false,error:"This post has multiple media choices; this simple frontend does not yet show the picker."});
  return reply(res,502,{ok:false,error:"Provider returned no direct download link."});
 }catch(e){return reply(res,502,{ok:false,error:"Could not reach the API server. Check URL, server status and authentication."})}
};