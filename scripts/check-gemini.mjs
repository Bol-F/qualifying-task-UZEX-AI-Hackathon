import { GoogleGenAI } from "@google/genai";
const key=process.env.GEMINI_API_KEY, model=process.env.GEMINI_MODEL||"gemini-3.5-flash-lite";
if(!key){console.error("Gemini key is not configured. No provider request was made.");process.exit(1);}
if(!/^[a-zA-Z0-9._-]{1,100}$/.test(model)){console.error("Invalid model name.");process.exit(1);}
try{
 const client=new GoogleGenAI({apiKey:key,httpOptions:{timeout:20000,retryOptions:{attempts:1}}});
 const result=await client.models.get({model,config:{abortSignal:AbortSignal.timeout(22000)}});
 console.log(JSON.stringify({status:"available",model:result.name,scope:"Model metadata access only; generation and tool routing are not tested by this command."}));
}catch(error){console.error(JSON.stringify({status:"unavailable",httpStatus:typeof error?.status==="number"?error.status:null}));process.exitCode=1;}
