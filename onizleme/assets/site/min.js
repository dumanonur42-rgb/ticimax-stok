function YM(){
var p=window.productDetailModel&&productDetailModel.product,i=document.getElementById('txtbxurunSiparisAdedi');
if(!p||!i)return;
var m=Math.max(+p.uyeAlimMin||0,+p.urunAdediMinimumDeger||0);
if(m<=1)return;
if(!(p.urunAdediMinimumDeger>=m))p.urunAdediMinimumDeger=m;
if(!(p.urunAdediVarsayilanDeger>=m))p.urunAdediVarsayilanDeger=m;
i.setAttribute('min',m);
function c(){if(!((parseFloat(String(i.value).replace(',','.'))||0)>=m)){i.value=m;}}
c();
if(i.__ym)return;i.__ym=1;
['change','blur','keyup'].forEach(function(e){i.addEventListener(e,c)});
var w=i.closest('.RadInput')||i.parentNode;
w.addEventListener('click',function(){setTimeout(c,0)});
}
