#include "PluginProcessor.h"
#include "PluginEditor.h"
namespace { juce::String stepId(int p,int s) { return "step_"+juce::String(p)+"_"+juce::String(s); } }
juce::AudioProcessorValueTreeState::ParameterLayout DrumProcessor::layout() {
 juce::AudioProcessorValueTreeState::ParameterLayout result;
 result.add(std::make_unique<juce::AudioParameterFloat>(juce::ParameterID{"master",1},"Master",0.0f,1.0f,0.82f));
 result.add(std::make_unique<juce::AudioParameterFloat>(juce::ParameterID{"tempo",1},"Local tempo",40.0f,220.0f,96.0f));
 result.add(std::make_unique<juce::AudioParameterBool>(juce::ParameterID{"sequencer",1},"Sequencer enabled",true));
 for(int p=0;p<16;++p) for(int s=0;s<16;++s) {
  const bool on=(p==0 && s%4==0)||(p==2 && s%8==4)||(p==5 && s%2==0);
  result.add(std::make_unique<juce::AudioParameterBool>(juce::ParameterID{stepId(p,s),1},juce::String(aixel::names[static_cast<size_t>(p)])+" step "+juce::String(s+1),on));
 }
 return result;
}
DrumProcessor::DrumProcessor():AudioProcessor(BusesProperties().withOutput("Stereo",juce::AudioChannelSet::stereo(),true)),state(*this,nullptr,"AiXelNativeV1",layout()) {
 for(int p=0;p<16;++p) for(int s=0;s<16;++s) steps[static_cast<size_t>(p*16+s)]=state.getRawParameterValue(stepId(p,s));
 master=state.getRawParameterValue("master"); tempo=state.getRawParameterValue("tempo"); enabled=state.getRawParameterValue("sequencer");
}
void DrumProcessor::prepareToPlay(double sr,int) { rate=sr; engine.prepare(sr); sequencer.reset(); localPpq=0; gain.reset(sr,0.02); gain.setCurrentAndTargetValue(master->load()); }
void DrumProcessor::toggleStep(int p,int s) {
 auto* parameter=state.getParameter(stepId(p,s));
 parameter->beginChangeGesture(); parameter->setValueNotifyingHost(stepOn(p,s)?0.0f:1.0f); parameter->endChangeGesture();
}
void DrumProcessor::processBlock(juce::AudioBuffer<float>& buffer,juce::MidiBuffer& midi) {
 juce::ScopedNoDenormals noDenormals;
 buffer.clear();
 double bpm=tempo->load(), ppq=localPpq;
 bool playing=localPlaying.load();
 if(!juce::JUCEApplicationBase::isStandaloneApp()) {
  playing=false;
  if(auto* host=getPlayHead()) if(auto pos=host->getPosition()) {
   if(auto b=pos->getBpm()) if(std::isfinite(*b) && *b>0) bpm=*b;
   if(auto q=pos->getPpqPosition()) if(std::isfinite(*q) && std::abs(*q)<1e12) { ppq=*q; playing=pos->getIsPlaying(); }
  }
 }
 displayedTempo.store(bpm);
 playing=playing && enabled->load()>0.5f;
 if(!playing) { sequencer.reset(); currentStep.store(-1); }
 const double increment=bpm/(60*rate);
 auto mask=pending.exchange(0);
 for(int p=0;p<16;++p) if(mask&(1u<<p)) engine.trigger(p,0.85f);
 gain.setTargetValue(master->load());
 auto it=midi.cbegin(); float maximum=0;
 for(int i=0;i<buffer.getNumSamples();++i) {
  while(it!=midi.cend() && (*it).samplePosition<=i) {
   const auto message=(*it).getMessage();
   if(message.isNoteOn()) for(int p=0;p<16;++p) if(message.getNoteNumber()==aixel::midiMap[static_cast<size_t>(p)]) engine.trigger(p,message.getFloatVelocity());
   if(message.isAllSoundOff() || message.isAllNotesOff()) engine.reset();
   ++it;
  }
  if(playing) {
   const int step=sequencer.tick(ppq+increment*i,increment);
   if(step>=0) { currentStep.store(step); for(int p=0;p<16;++p) if(stepOn(p,step)) engine.trigger(p,p==5?0.5f:0.85f); }
  }
  const float sample=std::tanh(engine.next()*gain.getNextValue());
  maximum=std::max(maximum,std::abs(sample));
  for(int c=0;c<buffer.getNumChannels();++c) buffer.setSample(c,i,sample);
 }
 if(juce::JUCEApplicationBase::isStandaloneApp()) localPpq=playing?ppq+increment*buffer.getNumSamples():0;
 peak.store(maximum); midi.clear();
}
void DrumProcessor::getStateInformation(juce::MemoryBlock& dest) { auto xml=state.copyState().createXml(); copyXmlToBinary(*xml,dest); }
void DrumProcessor::setStateInformation(const void* data,int size) {
 if(auto xml=getXmlFromBinary(data,size)) if(xml->hasTagName(state.state.getType())) state.replaceState(juce::ValueTree::fromXml(*xml));
}
juce::AudioProcessorEditor* DrumProcessor::createEditor() { return new DrumEditor(*this); }
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() { return new DrumProcessor(); }
