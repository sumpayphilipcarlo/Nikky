const scenarios=[
 {id:"morning-intelligence",title:"Morning Intelligence",signals:["calendar","weather","traffic","routine"],outcome:"Nikky prepares wake/departure guidance before the user asks."},
 {id:"late-meeting",title:"Late Meeting",signals:["calendar","traffic","presence"],outcome:"Nikky detects lateness, alerts the user, and prepares an authority-controlled delay message."},
 {id:"anniversary",title:"Anniversary Preparation",signals:["life-event","calendar","preferences"],outcome:"Nikky starts planning early and escalates preparation as the date approaches."},
 {id:"travel-day",title:"Travel Day",signals:["trip","weather","traffic","documents"],outcome:"Nikky coordinates packing, documents, wake time, departure and rechecks."},
 {id:"email-commitment",title:"Email Commitment",signals:["gmail","commitments","tasks"],outcome:"Nikky detects a promise, tracks it, and surfaces a follow-up before it is missed."},
 {id:"document-email",title:"Document to Email",signals:["file","document-intelligence","contacts","gmail"],outcome:"Nikky summarizes an authorized document, resolves the recipient, and proposes the email through approval."}
];
module.exports={scenarios};