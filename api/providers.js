export default function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  const providers={
    openai:{
      configured:Boolean(process.env.OPENAI_API_KEY),
      label:'OpenAI',
      env:'OPENAI_API_KEY',
      models:{fast:'GPT-5.6 Luna',balanced:'GPT-5.6 Terra',deep:'GPT-5.6 Sol / GPT-6 Astra'}
    },
    anthropic:{
      configured:Boolean(process.env.ANTHROPIC_API_KEY),
      label:'Claude',
      env:'ANTHROPIC_API_KEY',
      models:{fast:'Claude Haiku 4.5',balanced:'Claude Sonnet 5',deep:'Claude Opus 5'}
    },
    google:{
      configured:Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY),
      label:'Gemini',
      env:'GOOGLE_GENERATIVE_AI_API_KEY',
      models:{fast:'Gemini 3.5 Flash-Lite',balanced:'Gemini 3.8 Flash',deep:'Gemini 3.1 Pro'}
    }
  };
  res.status(200).json({providers,architecture:'direct-multi-provider',gateway:false});
}