function YF(){
if(document.getElementById('yfCss')||!document.querySelector('.RightDetail .PriceList')||!document.querySelector('.RightDetail .MiddleList'))return;
var cart="url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%230f2742' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='9' cy='20' r='1.4'/%3E%3Ccircle cx='18' cy='20' r='1.4'/%3E%3Cpath d='M2.5 3.5h2.6l2.3 11.2a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.2l1.6-7.3H6.1'/%3E%3C/svg%3E\")";
var R='.RightDetail ';
var st=document.createElement('style');st.id='yfCss';st.textContent=
R+'.PriceList{display:flex!important;align-items:center;gap:14px;background:#fff;border:1px solid #e3e8ef;border-bottom:0;border-radius:14px 14px 0 0;padding:16px 18px!important;margin:14px 0 0!important;box-sizing:border-box;box-shadow:0 6px 18px rgba(15,39,66,.05)}'+
R+'.MiddleList{background:#f7f9fc;border:1px solid #e3e8ef;border-top:1px dashed #d5dde8;border-radius:0 0 14px 14px;padding:14px 18px!important;box-sizing:border-box;box-shadow:0 6px 18px rgba(15,39,66,.05);height:auto!important}'+
R+'#divIndirimOrani{order:2;width:auto!important;height:auto!important;min-width:0!important;border-radius:8px!important;background:#c8102e!important;padding:5px 9px!important;margin:0 0 0 auto!important;align-self:flex-start;float:none!important;position:static!important}'+
R+'#divIndirimOrani>*:not(.yfB){display:none!important}'+R+'#divIndirimOrani .yfB{display:inline-block;font-size:14px;font-weight:700;color:#fff;line-height:1.2;white-space:nowrap}'+
R+'#pnlFiyatlar{order:1;width:auto!important;float:none!important;margin:0!important}'+
R+'#divIndirimliFiyat{display:flex;flex-direction:column;gap:2px;height:auto!important}'+
R+'.PiyasafiyatiContent .spanFiyat{font-size:14px!important;color:#94a3b8!important;font-weight:500!important;text-decoration:line-through}'+
R+'.IndirimliFiyatContent .spanFiyat,'+R+'#divIndirimliFiyat>.Formline:only-child .spanFiyat{font-size:30px!important;color:#0f2742!important;font-weight:800!important;letter-spacing:-.5px;line-height:1.15!important}'+
R+'#divKDVDahilFiyat{display:flex!important;align-items:baseline;gap:6px;margin-top:4px!important;height:auto!important}'+
R+'#divKDVDahilFiyat .lineTitle{white-space:nowrap;font-size:12px!important;color:#64748b!important;font-weight:600;width:auto!important}'+
R+'#divKDVDahilFiyat .spanFiyat{font-size:17px!important;color:#334155!important;font-weight:700!important}'+
R+'.MiddleList>*,'+R+'.MiddleList .buybutton{margin:0!important;padding:0!important;height:auto!important;min-height:0!important}'+R+'.BasketBtn{height:auto!important;margin:0!important;display:flex!important;gap:10px;align-items:stretch}'+
R+'.Basketinp{flex:0 0 132px;width:132px!important;margin:0!important}'+
R+'.Basketinp .RadInput{display:flex!important;width:100%!important;height:52px!important;border:1px solid #d5dde8;border-radius:12px;overflow:hidden;background:#fff}'+
R+'.Basketinp .qtyMinus{order:1}'+R+'.Basketinp input{order:2;flex:1;min-width:0;width:auto!important;border:0!important;font-size:18px!important;font-weight:700;color:#0f2742;text-align:center;height:100%!important;padding:0!important}'+R+'.Basketinp .qtyPlus{order:3}'+
R+'.Basketinp a{flex:0 0 40px;width:40px!important;height:100%!important;display:flex!important;align-items:center;justify-content:center;background:#f1f5f9!important;color:#0f2742!important;position:static!important;transition:background .15s}'+
R+'.Basketinp a:hover{background:#0f2742!important;color:#fff!important}'+R+'.Basketinp a i{line-height:1!important;font-size:13px!important}'+
R+'.basketBtn{flex:1;width:auto!important;margin:0!important}'+
R+'.btnAddBasketOnDetail{width:100%!important;height:52px!important;border:0!important;border-radius:12px!important;background:#ffca00 '+cart+' no-repeat calc(50% - 72px) 50%/22px!important;color:#0f2742!important;font-size:18px!important;font-weight:700!important;padding:0 0 0 30px!important;box-shadow:0 6px 16px rgba(255,202,0,.35);transition:transform .15s,box-shadow .15s,background-color .15s;cursor:pointer}'+
R+'.btnAddBasketOnDetail:hover{background-color:#ffd633!important;box-shadow:0 8px 20px rgba(255,202,0,.45);transform:translateY(-1px)}'+
R+'.btnAddBasketOnDetail:active{transform:translateY(0)}'+
'@media(max-width:767px){'+R+'#divIndirimOrani .yfB{font-size:13px}'+R+'#divIndirimOrani .yfB i{display:none}'+R+'.PriceList,'+R+'.MiddleList{max-width:none;padding:12px 14px!important}'+R+'.PriceList{margin-top:10px!important}'+R+'.IndirimliFiyatContent .spanFiyat,'+R+'#divIndirimliFiyat>.Formline:only-child .spanFiyat{font-size:26px!important}'+R+'.Basketinp{flex-basis:112px;width:112px!important}'+R+'.Basketinp a{flex-basis:34px;width:34px!important}'+R+'.btnAddBasketOnDetail{font-size:17px!important;height:48px!important;background-position:calc(50% - 64px) 50%!important}'+R+'.Basketinp .RadInput{height:48px!important}}';
document.head.appendChild(st);
var io=document.getElementById('ltrIndirimOrani'),di=document.getElementById('divIndirimOrani');if(io&&di&&/\d/.test(io.textContent)){var bb=document.createElement('span');bb.className='yfB';bb.innerHTML='%'+io.textContent.trim().replace(/[<>&]/g,'')+'<i style="font-style:normal"> indirim</i>';di.appendChild(bb)}
}
