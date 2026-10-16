// Loopback HTTP presentation fixture, NOT a provider or queue implementation.
// Real queue/RLS/version logic is tested by content-translations-db.integration.cjs.
const {createHash,randomUUID}=require('node:crypto');
module.exports=function createFixture(getItems){
 let data=[];
 const fields=['title','description','category'];
 const hash=text=>createHash('sha256').update(text).digest('hex');
 const missing=()=>process.env.DYNAMIC_TRANSLATIONS_UNAVAILABLE==='1';
 function sync(item,completed=false){
  if(missing())return;
  for(const field of fields){
   let row=data.find(row=>row.entity_id===item.id&&row.field_name===field);
   if(row?.source_hash===hash(item[field]))continue;
   if(!row){row={id:randomUUID(),entity_type:'roadmap',entity_id:item.id,field_name:field,locale:'zh-CN',translation_source:'auto',translated_text:null,translated_source_hash:null};data.push(row);}
   Object.assign(row,{source_text:item[field],source_hash:hash(item[field]),generation:randomUUID(),updated_at:new Date().toISOString(),error_code:null,translation_status:row.translation_source==='manual'?'outdated':completed?'completed':'pending'});
   if(completed){row.translated_text=field==='title'?({planned:'计划中的测试功能',completed:'已完成的测试功能',on_hold:'暂停的测试功能'}[item.status]):field==='description'?'本地浏览器测试内容':'平台';row.translated_source_hash=row.source_hash;}
  }
 }
 getItems().forEach(item=>sync(item,true));
 function handle(url,req,body,role,send,rows){
  const path=url.pathname;
  if(path==='/__fixture/translations/finish'){
   for(const row of data)if(row.translation_source==='auto'&&['pending','outdated'].includes(row.translation_status))Object.assign(row,{translated_text:'自动译文：'+row.source_text,translated_source_hash:row.source_hash,translation_status:'completed',generation:randomUUID()});
   send({fixture:true});return true;
  }
  if(!path.startsWith('/rest/v1/'))return false;
  const rpc=path.split('/').pop();
  if(!['get_public_content_translations','content_translations','edit_content_translation','regenerate_content_translation','backfill_content_translations'].includes(rpc))return false;
  if(missing()){send({code:'PGRST202',message:'Local migration unavailable'},404);return true;}
  data=data.filter(row=>getItems().some(item=>item.id===row.entity_id));
  if(rpc==='get_public_content_translations'){send(data.filter(row=>(body.p_entity_ids??[]).includes(row.entity_id)&&getItems().some(item=>item.id===row.entity_id&&item.publication_status==='published')));return true;}
  if(role!=='admin'){send({code:'42501',message:'Access denied'},403);return true;}
  if(rpc==='content_translations'){
   const ids=(url.searchParams.get('entity_id')??'').replace(/^in\.\(/,'').replace(/\)$/,'').replaceAll('"','').split(',');rows(data.filter(row=>ids.includes(row.entity_id)));return true;
  }
  if(rpc==='backfill_content_translations'){getItems().forEach(item=>sync(item));send({processed:getItems().length,changed:0,next_cursor:null});return true;}
  const item=getItems().find(item=>item.id===body.p_entity_id);
  const row=data.find(row=>row.entity_id===body.p_entity_id&&row.field_name===body.p_field&&row.locale===body.p_locale);
  if(!item||!row||row.generation!==body.p_expected_generation||item[body.p_field]!==body.p_expected_source){send({code:'40001',message:'Version conflict'},409);return true;}
  if(rpc==='regenerate_content_translation'){
   if(row.translation_source==='manual'&&body.p_confirm_manual!==true){send({code:'42501'},403);return true;}
   Object.assign(row,{translation_source:'auto',translation_status:'pending',generation:randomUUID()});
  }else Object.assign(row,{translation_source:'manual',translation_status:'completed',translated_text:body.p_text,translated_source_hash:row.source_hash,generation:randomUUID()});
  row.updated_at=new Date().toISOString();send(row.generation);return true;
 }
 return{sync,handle};
};
