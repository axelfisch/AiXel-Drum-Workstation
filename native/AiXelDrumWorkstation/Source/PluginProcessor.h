#pragma once
#include <juce_audio_utils/juce_audio_utils.h>
#include "DrumEngine.h"
#include "PatternSequencer.h"
class DrumProcessor final : public juce::AudioProcessor {
public:
 DrumProcessor();
 void prepareToPlay(double,int) override;
 void releaseResources() override {}
 void processBlock(juce::AudioBuffer<float>&,juce::MidiBuffer&) override;
 bool isBusesLayoutSupported(const BusesLayout& l) const override { return l.getMainOutputChannelSet()==juce::AudioChannelSet::stereo() && l.getMainInputChannelSet().isDisabled(); }
 juce::AudioProcessorEditor* createEditor() override;
 bool hasEditor() const override { return true; }
 const juce::String getName() const override { return "AiXel Drum Workstation"; }
 bool acceptsMidi() const override { return true; }
 bool producesMidi() const override { return false; }
 double getTailLengthSeconds() const override { return 2.5; }
 int getNumPrograms() override { return 1; }
 int getCurrentProgram() override { return 0; }
 void setCurrentProgram(int) override {}
 const juce::String getProgramName(int) override { return "Native Starter"; }
 void changeProgramName(int,const juce::String&) override {}
 void getStateInformation(juce::MemoryBlock&) override;
 void setStateInformation(const void*,int) override;
 void triggerPad(int pad) { if(pad>=0 && pad<16) pending.fetch_or(1u<<pad); }
 bool stepOn(int p,int s) const { return steps[static_cast<size_t>(p*16+s)]->load()>0.5f; }
 void toggleStep(int p,int s);
 juce::AudioProcessorValueTreeState state;
 std::atomic<bool> localPlaying{false};
 std::atomic<int> currentStep{-1};
 std::atomic<float> peak{0};
 std::atomic<double> displayedTempo{96};
private:
 static juce::AudioProcessorValueTreeState::ParameterLayout layout();
 std::array<std::atomic<float>*,256> steps{};
 std::atomic<float>* master=nullptr; std::atomic<float>* tempo=nullptr; std::atomic<float>* enabled=nullptr;
 std::atomic<unsigned> pending{0};
 aixel::DrumEngine engine; aixel::PatternSequencer sequencer;
 juce::SmoothedValue<float> gain;
 double rate=48000, localPpq=0;
};
