export const SHIFTS = [
 {name:'THE FIRST IMPRESSION',target:3,time:90,speed:1},
 {name:'WORD GETS AROUND',target:5,time:85,speed:1.25},
 {name:'THE SEAT OF POWER',target:7,time:80,speed:1.5}
];
export function sitPoints(combo, vip){return 100*Math.min(combo,5)*(vip?2:1)}
export function within(a,b,r){return Math.hypot(a.x-b.x,a.z-b.z)<r}
export function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
