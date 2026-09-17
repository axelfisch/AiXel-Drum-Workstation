#pragma once
#include <array>
#include <cmath>
#include <cstdint>
#include <algorithm>
namespace aixel {
inline constexpr std::array<int,16> midiMap {36,35,38,39,37,42,46,51,49,50,47,45,63,62,70,75};
inline constexpr std::array<const char*,16> names {"Kick 1","Kick 2","Snare","Clap","Rim / Stick","Closed Hat","Open Hat","Ride","Crash","Tom High","Tom Mid","Tom Low","Perc 1","Perc 2","Shaker","FX / User"};
// Fixed voice pool: no allocation or locks during rendering. One-shot synthesis.
class DrumEngine {
 struct Voice { int pad=0; double age=10, phase=0; float velocity=0, previousNoise=0; };
 std::array<Voice,48> voices {};
 double sampleRate=48000;
 uint32_t random=0x12345678;
 static int group(int p) { return p==5 || p==6 ? 1 : p>=9 && p<=11 ? 2 : 0; }
public:
 void prepare(double sr) { sampleRate=sr; reset(); }
 void reset() { for(auto& v:voices) v=Voice{}; }
 void trigger(int pad,float velocity) {
  if(pad<0 || pad>=16) return;
  for(auto& v:voices) if(group(pad)!=0 && group(v.pad)==group(pad)) v.velocity=0;
  auto* slot=&voices[0];
  for(auto& v:voices) { if(v.velocity<=0) { slot=&v; break; } if(v.age>slot->age) slot=&v; }
  *slot={pad,0,0,std::clamp(velocity,0.0f,1.0f),0};
 }
 float next() {
  double sum=0;
  for(auto& v:voices) {
   if(v.velocity<=0) continue;
   const int p=v.pad; const double t=v.age;
   const double decay = p<2 ? 8 : p==6 ? 7 : p==8 ? 3.5 : p==7 ? 5 : p==5 || p==14 ? 48 : 16;
   if(t>2.5 || std::exp(-t*decay)<0.00001) { v.velocity=0; continue; }
   random^=random<<13; random^=random>>17; random^=random<<5;
   const float noise=static_cast<float>(static_cast<double>(random)/2147483648.0-1.0);
   const float high=noise-v.previousNoise; v.previousNoise=noise;
   double hz= p<2 ? (p==0?48:62)+120*std::exp(-t*35) : p>=9 && p<=13 ? 360-(p-9)*48 : p==4 ? 1500 : 180;
   v.phase+=6.283185307179586*hz/sampleRate;
   double signal=std::sin(v.phase);
   if(p==2 || p==3) signal=0.25*signal+0.65*noise;
   if(p>=5 && p<=8) signal=0.35*high+0.15*std::sin(v.phase*17.3)*std::sin(v.phase*23.7);
   if(p==14) signal=0.5*high;
   if(p==15) signal=std::sin(v.phase+4*std::sin(v.phase*2.7));
   sum+=signal*std::min(1.0,t/0.001)*std::exp(-t*decay)*v.velocity*0.3;
   v.age+=1.0/sampleRate;
  }
  return static_cast<float>(sum);
 }
};
}
