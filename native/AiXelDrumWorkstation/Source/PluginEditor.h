#pragma once
#include "PluginProcessor.h"
class DrumEditor final : public juce::AudioProcessorEditor, private juce::Timer {
public:
 explicit DrumEditor(DrumProcessor&);
 void paint(juce::Graphics&) override;
 void resized() override;
private:
 void timerCallback() override;
 DrumProcessor& drums;
 juce::Label title, status;
 juce::TextButton transport;
 juce::ToggleButton enable{"Pattern enabled"};
 juce::Slider master,tempo;
 std::array<juce::TextButton,16> pads;
 std::array<juce::TextButton,256> grid;
 std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> masterAttachment,tempoAttachment;
 std::unique_ptr<juce::AudioProcessorValueTreeState::ButtonAttachment> enableAttachment;
};
