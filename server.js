const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const http = require('http');
const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const STORAGE_DIR = path.join(ROOT, 'storage');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SESSION_SECRET = process.env.SESSION_SECRET || 'eldercare-local-development-secret-change-me';
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(STORAGE_DIR, { recursive: true });

const seed = {
  users: [
    { id:'u1', name:'Sunita Deshmukh', email:'sunita.demo@eldercare.example', password:'Demo!Password123', role:'elder', elderId:'e1' },
    { id:'u2', name:'Rahul Deshmukh', email:'rahul.demo@eldercare.example', password:'Demo!Password123', role:'family', elderId:'e1' },
    { id:'u3', name:'Dr. Ashok Patil', email:'dr.patil.demo@eldercare.example', password:'Demo!Password123', role:'doctor', elderId:'e1' },
    { id:'u4', name:'Caregiver Demo', email:'caregiver.demo@eldercare.example', password:'Demo!Password123', role:'caregiver', elderId:'e1' },
    { id:'u5', name:'Admin Demo', email:'admin.demo@eldercare.example', password:'Demo!Password123', role:'admin', elderId:null }
  ],
  elders: [{ id:'e1', name:'Sunita Deshmukh', dob:'1954-03-14', bloodGroup:'B+', status:'stable', allergies:['Penicillin','Peanuts'], conditions:['Type 2 Diabetes','Hypertension'], medicalNotes:'Prefers reading materials in Marathi. Uses a walking stick outdoors.', primaryDoctor:'Dr. Ashok Patil', hospital:'Sanjeevani Multispeciality Hospital, Aurangabad', insuranceProvider:'Star Health Assurance', insurancePolicy:'SH-2291-4487', vaccinations:[{name:'Influenza',date:'2025-11-02'},{name:'COVID-19 Booster',date:'2025-06-15'}], surgeries:[{name:'Cataract surgery (right eye)',date:'2022-09-10'}], lastUpdated:'2026-08-20' }],
  medicines: [
    {id:'m1',name:'Metformin',purpose:'Diabetes control',dosage:'500 mg',frequency:'Twice daily',instructions:'Take after food',doctor:'Dr. Ashok Patil',schedule:[{slot:'Morning',time:'8:00 AM',status:'taken'},{slot:'Evening',time:'8:00 PM',status:'pending'}]},
    {id:'m2',name:'Amlodipine',purpose:'Blood pressure',dosage:'5 mg',frequency:'Once daily',instructions:'Take in the morning, with or without food',doctor:'Dr. Ashok Patil',schedule:[{slot:'Morning',time:'8:30 AM',status:'taken'}]},
    {id:'m3',name:'Vitamin D3',purpose:'Bone health',dosage:'60,000 IU',frequency:'Once weekly',instructions:'Take with milk, once a week on Sunday',doctor:'Dr. Ashok Patil',schedule:[{slot:'Afternoon',time:'1:00 PM',status:'pending'}]},
    {id:'m4',name:'Atorvastatin',purpose:'Cholesterol',dosage:'10 mg',frequency:'Once daily',instructions:'Take at night before sleeping',doctor:'Dr. Ashok Patil',schedule:[{slot:'Night',time:'9:30 PM',status:'missed'}]}
  ],
  appointments: [
    {id:'a1',doctor:'Dr. Ashok Patil',hospital:'Sanjeevani Multispeciality Hospital',date:'2026-09-12',time:'11:00 AM',purpose:'Quarterly diabetes check-up',notes:'Bring recent sugar log',location:'OPD Block A, Room 204',reminder:true,status:'upcoming'},
    {id:'a2',doctor:'Dr. Meera Kulkarni',hospital:'Aurangabad Eye Care Centre',date:'2026-09-25',time:'4:30 PM',purpose:'Annual eye check-up',notes:'',location:'2nd floor, Cabin 3',reminder:true,status:'upcoming'},
    {id:'a3',doctor:'Dr. Ashok Patil',hospital:'Sanjeevani Multispeciality Hospital',date:'2026-06-18',time:'10:00 AM',purpose:'Routine blood pressure review',notes:'Readings were stable',location:'OPD Block A, Room 204',reminder:false,status:'past'}
  ],
  family: [
    {id:'f1',name:'Rahul Deshmukh',relation:'Son',phone:'+91 98230 11122',email:'rahul.deshmukh@example.com',city:'Pune',emergencyContact:true},
    {id:'f2',name:'Priya Deshmukh-Joshi',relation:'Daughter',phone:'+91 98670 44551',email:'priya.joshi@example.com',city:'Mumbai',emergencyContact:false},
    {id:'f3',name:'Anil Deshmukh',relation:'Younger brother',phone:'+91 94040 77812',email:'anil.deshmukh@example.com',city:'Aurangabad',emergencyContact:false}
  ],
  documents: [
    {id:'d1',name:'Blood Sugar Report - Aug 2026',type:'Blood report',date:'2026-08-18',uploadedBy:'Rahul Deshmukh',modified:'2026-08-19',filename:null},
    {id:'d2',name:'Metformin Prescription',type:'Prescription',date:'2026-06-01',uploadedBy:'Dr. Ashok Patil',modified:'2026-06-01',filename:null},
    {id:'d3',name:'Chest X-Ray',type:'Scan report',date:'2025-12-05',uploadedBy:'Sunita Deshmukh',modified:'2025-12-05',filename:null},
    {id:'d4',name:'Star Health Insurance Card',type:'Insurance document',date:'2024-01-15',uploadedBy:'Rahul Deshmukh',modified:'2024-01-15',filename:null}
  ],
  alerts: [
    {id:'al1',type:'medicine',message:'Atorvastatin (9:30 PM) was marked as missed.',time:'Yesterday, 9:45 PM'},
    {id:'al2',type:'appointment',message:'Appointment with Dr. Ashok Patil is coming up.',time:'Today, 7:00 AM'},
    {id:'al3',type:'document',message:'Rahul Deshmukh uploaded a new blood report.',time:'2 days ago'}
  ],
  auditLog: [
    {id:'l1',who:'Rahul Deshmukh (Family)',action:'Viewed medicine schedule',time:'Today, 7:02 AM'},
    {id:'l2',who:'Dr. Ashok Patil (Doctor)',action:'Updated medical conditions',time:'Aug 20, 2026, 4:15 PM'},
    {id:'l3',who:'Admin',action:'Viewed account/audit area',time:'Aug 12, 2026, 11:00 AM'}
  ],
  sessions: {}
};

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = JSON.parse(JSON.stringify(seed));
    for (const u of initial.users) { u.passwordHash = bcrypt.hashSync(u.password, 12); delete u.password; }
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
let db = loadDB();
function saveDB(){ fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
function id(prefix){ return prefix + crypto.randomBytes(5).toString('hex'); }
function now(){ return new Date().toISOString(); }
function audit(who, action){ db.auditLog.unshift({id:id('log_'),who,action,time:new Date().toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}); db.auditLog=db.auditLog.slice(0,300); saveDB(); }
function safeUser(u){ return u && {id:u.id,name:u.name,email:u.email,role:u.role,elderId:u.elderId}; }
function roleCanMedical(role){ return ['elder','family','caregiver','doctor'].includes(role); }
function roleCanEditMedical(role){ return ['elder','doctor'].includes(role); }
function roleCanDocs(role){ return ['elder','family','doctor'].includes(role); }

app.use(express.json({limit:'2mb'}));
app.use(express.urlencoded({extended:true}));

const upload = multer({ storage: multer.diskStorage({
  destination: (_,__,cb)=>cb(null,STORAGE_DIR),
  filename: (_,file,cb)=>cb(null, Date.now()+'-'+crypto.randomBytes(5).toString('hex')+path.extname(file.originalname))
}), limits:{fileSize:10*1024*1024} });

function auth(req,res,next){
  const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ec_session='));
  const raw=token && token.slice('ec_session='.length);
  const s=raw && db.sessions[raw];
  if(!s || s.expiresAt<Date.now()){ if(raw) delete db.sessions[raw]; saveDB(); return res.status(401).json({error:'Authentication required'}); }
  const u=db.users.find(x=>x.id===s.userId); if(!u) return res.status(401).json({error:'Invalid session'});
  req.user=u; req.sessionToken=raw; next();
}
function requireRole(...roles){ return (req,res,next)=>roles.includes(req.user.role)?next():res.status(403).json({error:'Forbidden'}); }
function elderFor(req){ return db.elders.find(e=>e.id===req.user.elderId) || db.elders[0]; }
function dashboard(req){
  const primary=db.family.find(f=>f.emergencyContact)||db.family[0]||null;
  if(req.user.role==='admin') return {user:safeUser(req.user),family:db.family,alerts:db.alerts,documents:[],permissions:{admin:true,medical:false}};
  const elder=elderFor(req); const medicines=db.medicines; const upcoming=db.appointments.filter(a=>a.status==='upcoming').sort((a,b)=>a.date.localeCompare(b.date))[0]||null;
  return {user:safeUser(req.user),elder,medicines,appointments:db.appointments,family:db.family,documents:roleCanDocs(req.user.role)?db.documents:[],alerts:db.alerts,nextAppointment:upcoming,primaryContact:primary};
}

app.get('/api/health',(_,res)=>res.json({ok:true,service:'ElderCare API',time:now()}));
app.post('/api/auth/login',async(req,res)=>{
  const email=String(req.body.email||'').trim().toLowerCase(), password=String(req.body.password||'');
  const u=db.users.find(x=>x.email.toLowerCase()===email); if(!u || !(await bcrypt.compare(password,u.passwordHash))) return res.status(401).json({error:'Invalid email or password'});
  const token=crypto.randomBytes(32).toString('hex'); db.sessions[token]={userId:u.id,expiresAt:Date.now()+1000*60*60*12}; saveDB(); audit(u.name,'Signed in');
  res.setHeader('Set-Cookie',`ec_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200${process.env.NODE_ENV==='production'?'; Secure':''}`); res.json({user:safeUser(u)});
});
app.post('/api/auth/register',async(req,res)=>{
  const name=String(req.body.name||'').trim(), email=String(req.body.email||'').trim().toLowerCase(), password=String(req.body.password||''), role=['elder','family','caregiver','doctor'].includes(req.body.role)?req.body.role:'family';
  if(!name||!email||password.length<8) return res.status(400).json({error:'Name, email and an 8+ character password are required'});
  if(db.users.some(u=>u.email.toLowerCase()===email)) return res.status(409).json({error:'Account already exists'});
  const u={id:id('u_'),name,email,passwordHash:await bcrypt.hash(password,12),role,elderId:db.elders[0]?.id||null}; db.users.push(u); saveDB(); audit(name,'Created an account'); res.status(201).json({user:safeUser(u)});
});
app.post('/api/auth/logout',auth,(req,res)=>{delete db.sessions[req.sessionToken];saveDB();res.setHeader('Set-Cookie','ec_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');audit(req.user.name,'Signed out');res.json({ok:true});});
app.get('/api/auth/session',auth,(req,res)=>res.json({user:safeUser(req.user)}));
app.delete('/api/auth/session',auth,(req,res)=>{for(const [t,s] of Object.entries(db.sessions))if(s.userId===req.user.id)delete db.sessions[t];saveDB();res.setHeader('Set-Cookie','ec_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');res.json({ok:true});});
app.get('/api/me/context',auth,(req,res)=>res.json({user:safeUser(req.user),elder:elderFor(req),permissions:{medical:roleCanMedical(req.user.role),medicalEdit:roleCanEditMedical(req.user.role),documents:roleCanDocs(req.user.role),admin:req.user.role==='admin'}}));
app.get('/api/dashboard',auth,(req,res)=>res.json(dashboard(req)));

app.get('/api/medical-profile',auth,(req,res)=>roleCanMedical(req.user.role)?res.json(elderFor(req)):res.status(403).json({error:'Medical access denied'}));
app.patch('/api/medical-profile',auth,requireRole('elder','doctor'),(req,res)=>{const e=elderFor(req); const allowed=['bloodGroup','allergies','conditions','medicalNotes','primaryDoctor','hospital','insuranceProvider','insurancePolicy','vaccinations','surgeries']; for(const k of allowed)if(req.body[k]!==undefined)e[k]=req.body[k];e.lastUpdated=new Date().toISOString().slice(0,10);saveDB();audit(req.user.name,'Updated medical profile');res.json(e);});

app.get('/api/medications',auth,(req,res)=>roleCanMedical(req.user.role)?res.json(db.medicines):res.status(403).json({error:'Medical access denied'}));
app.post('/api/medications',auth,requireRole('elder','doctor'),(req,res)=>{const m={id:id('m_'),name:String(req.body.name||'New medicine'),purpose:String(req.body.purpose||''),dosage:String(req.body.dosage||''),frequency:String(req.body.frequency||'Once daily'),instructions:String(req.body.instructions||''),doctor:req.user.name,schedule:Array.isArray(req.body.schedule)?req.body.schedule:[{slot:'Morning',time:'8:00 AM',status:'pending'}]};db.medicines.push(m);saveDB();audit(req.user.name,`Added medicine ${m.name}`);res.status(201).json(m);});
app.post('/api/medications/:id/mark',auth,(req,res)=>{const m=db.medicines.find(x=>x.id===req.params.id);if(!m)return res.status(404).json({error:'Medicine not found'});const i=Number(req.body.slotIndex);const status=['taken','pending','missed'].includes(req.body.status)?req.body.status:'pending';if(!m.schedule[i])return res.status(400).json({error:'Schedule slot not found'});m.schedule[i].status=status;saveDB();audit(req.user.name,`Marked ${m.name} as ${status}`);res.json(m);});

app.get('/api/appointments',auth,(req,res)=>roleCanMedical(req.user.role)?res.json(db.appointments):res.status(403).json({error:'Medical access denied'}));
app.post('/api/appointments',auth,requireRole('elder','family','doctor'),(req,res)=>{const a={id:id('a_'),doctor:String(req.body.doctor||''),hospital:String(req.body.hospital||''),date:String(req.body.date||''),time:String(req.body.time||''),purpose:String(req.body.purpose||''),notes:String(req.body.notes||''),location:String(req.body.location||''),reminder:req.body.reminder!==false,status:'upcoming'};if(!a.doctor||!a.date)return res.status(400).json({error:'Doctor and date are required'});db.appointments.push(a);saveDB();audit(req.user.name,'Added appointment');res.status(201).json(a);});
app.patch('/api/appointments/:id',auth,requireRole('elder','family','doctor'),(req,res)=>{const a=db.appointments.find(x=>x.id===req.params.id);if(!a)return res.status(404).json({error:'Appointment not found'});Object.assign(a,req.body);saveDB();audit(req.user.name,'Updated appointment');res.json(a);});
app.delete('/api/appointments/:id',auth,requireRole('elder','family','doctor'),(req,res)=>{const a=db.appointments.find(x=>x.id===req.params.id);if(!a)return res.status(404).json({error:'Appointment not found'});a.status='cancelled';saveDB();audit(req.user.name,'Cancelled appointment');res.json(a);});

app.get('/api/family-members',auth,(req,res)=>res.json(db.family));
app.post('/api/family-members',auth,requireRole('elder'),(req,res)=>{const f={id:id('f_'),name:String(req.body.name||''),relation:String(req.body.relation||''),phone:String(req.body.phone||''),email:String(req.body.email||''),city:String(req.body.city||''),emergencyContact:false};db.family.push(f);saveDB();audit(req.user.name,`Added family member ${f.name}`);res.status(201).json(f);});
app.patch('/api/family-members/:id',auth,requireRole('elder'),(req,res)=>{const f=db.family.find(x=>x.id===req.params.id);if(!f)return res.status(404).json({error:'Family member not found'});Object.assign(f,req.body);if(f.emergencyContact)db.family.forEach(x=>{if(x.id!==f.id)x.emergencyContact=false});saveDB();audit(req.user.name,`Updated family member ${f.name}`);res.json(f);});
app.delete('/api/family-members/:id',auth,requireRole('elder'),(req,res)=>{db.family=db.family.filter(x=>x.id!==req.params.id);saveDB();audit(req.user.name,'Removed family member');res.json({ok:true});});

app.get('/api/documents',auth,(req,res)=>roleCanDocs(req.user.role)?res.json(db.documents):res.status(403).json({error:'Document access denied'}));
app.post('/api/documents',auth,requireRole('elder','family','doctor'),upload.single('file'),(req,res)=>{const d={id:id('d_'),name:String(req.body.name||req.file?.originalname||'Uploaded document'),type:String(req.body.type||'Document'),date:new Date().toISOString().slice(0,10),uploadedBy:req.user.name,modified:new Date().toISOString().slice(0,10),filename:req.file?.filename||null};db.documents.unshift(d);saveDB();audit(req.user.name,`Uploaded document ${d.name}`);res.status(201).json(d);});
app.delete('/api/documents/:id',auth,requireRole('elder','family'),(req,res)=>{const d=db.documents.find(x=>x.id===req.params.id);if(!d)return res.status(404).json({error:'Document not found'});if(d.filename){try{fs.unlinkSync(path.join(STORAGE_DIR,d.filename))}catch{}}db.documents=db.documents.filter(x=>x.id!==d.id);saveDB();audit(req.user.name,`Deleted document ${d.name}`);res.json({ok:true});});
app.get('/api/documents/:id/download',auth,(req,res)=>{if(!roleCanDocs(req.user.role))return res.status(403).json({error:'Document access denied'});const d=db.documents.find(x=>x.id===req.params.id);if(!d||!d.filename)return res.status(404).json({error:'No downloadable file for this document'});const file=path.join(STORAGE_DIR,d.filename);if(!fs.existsSync(file))return res.status(404).json({error:'Stored file not found'});audit(req.user.name,`Downloaded document ${d.name}`);res.download(file,d.name);});

app.get('/api/emergency-contacts',auth,(req,res)=>roleCanMedical(req.user.role)?res.json(db.family):res.status(403).json({error:'Emergency data restricted'}));
app.post('/api/emergency-contacts',auth,requireRole('elder'),(req,res)=>{const f={id:id('f_'),name:req.body.name||'',relation:req.body.relation||'Contact',phone:req.body.phone||'',email:req.body.email||'',city:req.body.city||'',emergencyContact:true};db.family.forEach(x=>x.emergencyContact=false);db.family.push(f);saveDB();audit(req.user.name,`Added emergency contact ${f.name}`);res.status(201).json(f);});
app.get('/api/notifications',auth,(req,res)=>res.json(db.alerts));
app.patch('/api/notifications',auth,(req,res)=>{if(req.body.id){db.alerts=db.alerts.filter(a=>a.id!==req.body.id)}else db.alerts=[];saveDB();res.json(db.alerts);});
app.get('/api/admin/users',auth,requireRole('admin'),(req,res)=>res.json(db.users.map(safeUser)));
app.get('/api/admin/audit-log',auth,requireRole('admin'),(req,res)=>res.json(db.auditLog));

app.use(express.static(path.join(ROOT,'frontend')));
app.get('*',(req,res)=>res.sendFile(path.join(ROOT,'frontend','index.html')));

const server=http.createServer(app);
server.listen(PORT,()=>console.log(`\nElderCare is running at http://localhost:${PORT}\nDemo password: Demo!Password123\n`));
