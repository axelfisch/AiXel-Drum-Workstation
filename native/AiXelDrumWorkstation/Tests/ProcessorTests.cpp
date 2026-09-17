#include "PluginProcessor.h"
#include <iostream>
#include <stdexcept>
struct Host final:juce::AudioPlayHead {
 double ppq=0,bpm=120; bool playing=false;
 juce::Optional<PositionInfo> getPosition() const override { PositionInfo p; p.setPpqPosition(ppq); p.setBpm(bpm); p.setIsPlaying(playing); return p; }
};
void require(bool ok,const char* message) { if(!ok) throw std::runtime_error(message); }
int main() {
 juce::ScopedJuceInitialiser_GUI init;
 try {
  DrumProcessor processor; Host host; processor.setPlayHead(&host); processor.prepareToPlay(48000,256);
  juce::AudioBuffer<float> audio(2,256); juce::MidiBuffer midi;
  for(int pad=0;pad<16;++pad) {
   processor.prepareToPlay(48000,256);
   midi.addEvent(juce::MidiMessage::noteOn(10,aixel::midiMap[static_cast<size_t>(pad)],0.8f),64);
   processor.processBlock(audio,midi);
   require(audio.getMagnitude(0,0,64)==0,"MIDI fired before sample offset");
   require(audio.getMagnitude(0,64,192)>0.001f,"MIDI pad silent");
   for(int i=0;i<256;++i) require(std::isfinite(audio.getSample(0,i)) && audio.getSample(0,i)==audio.getSample(1,i),"invalid stereo audio");
  }
  processor.prepareToPlay(48000,256); processor.triggerPad(0); processor.processBlock(audio,midi); require(audio.getMagnitude(0,256)>0.001f,"UI pad silent");
  processor.prepareToPlay(48000,256); host.playing=true; host.ppq=0;
  processor.processBlock(audio,midi); require(processor.currentStep.load()==0 && audio.getMagnitude(0,256)>0.001f,"host start failed");
  host.ppq=2; processor.processBlock(audio,midi); require(processor.currentStep.load()==8,"seek failed");
  host.ppq=0; processor.processBlock(audio,midi); require(processor.currentStep.load()==0,"loop failed");
  host.playing=false; for(int i=0;i<600;++i) processor.processBlock(audio,midi);
  require(audio.getMagnitude(0,256)==0 && processor.currentStep.load()==-1,"stop failed");
  for(double bpm:{60.0,96.0,120.0,220.0}) for(int block:{64,127,512}) {
   aixel::PatternSequencer clock; const double inc=bpm/(60*48000); int hits=0;
   for(int base=0;base<48000*4;base+=block) for(int i=0;i<std::min(block,48000*4-base);++i) if(clock.tick((base+i)*inc,inc)>=0) ++hits;
   require(hits==static_cast<int>(std::ceil(4*bpm/60*4)),"clock tempo/block mismatch");
  }
  processor.toggleStep(15,15); juce::MemoryBlock saved; processor.getStateInformation(saved);
  DrumProcessor restored; restored.setStateInformation(saved.getData(),static_cast<int>(saved.getSize())); require(restored.stepOn(15,15),"state lost step");
  const char invalid[]="bad state"; restored.setStateInformation(invalid,9); require(restored.stepOn(15,15),"invalid state corrupted project");
  std::cout<<"PASS: 16 MIDI pads, sample offsets, UI pad, stereo, host start/stop/seek/loop, 4 tempi x 3 block sizes, state roundtrip.\n";
 } catch(const std::exception& e) { std::cerr<<e.what()<<'\n'; return 1; }
}
