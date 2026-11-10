import json,os,shutil,glob
R='/home/ubuntu/repos/ticimax-stok'
o=[json.loads(l) for l in open('/home/ubuntu/work/urunler_raw.jsonl')]
for f in glob.glob(R+'/gorseller/*.jpg'): os.remove(f)
for x in o:
    c='/home/ubuntu/work/img/cache/'+os.path.basename(x.pop('_img_src'))
    shutil.copy(c,R+'/'+x['resim'])
with open(R+'/urunler.jsonl','w') as f:
    for x in o: f.write(json.dumps(x,ensure_ascii=False)+'\n')
print(len(o),len(os.listdir(R+'/gorseller')))
