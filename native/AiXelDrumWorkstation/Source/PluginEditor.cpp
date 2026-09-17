#include "PluginEditor.h"
DrumEditor::DrumEditor(DrumProcessor& p):AudioProcessorEditor(p),drums(p) {
 title.setText("AiXel DRUM WORKSTATION   /   NATIVE 0.1",juce::dontSendNotification); title.setFont(juce::Font(juce::FontOptions(22.0f))); addAndMakeVisible(title);
 addAndMakeVisible(status); addAndMakeVisible(transport); addAndMakeVisible(enable);
 const bool standalone=juce::JUCEApplicationBase::isStandaloneApp();
 transport.setButtonText(standalone?"Play / Stop":"Transport: host"); transport.setEnabled(standalone);
 transport.onClick=[this] { drums.localPlaying.store(!drums.localPlaying.load()); };
 for(auto* slider:{&master,&tempo}) { slider->setSliderStyle(juce::Slider::LinearHorizontal); slider->setTextBoxStyle(juce::Slider::TextBoxRight,false,70,24); addAndMakeVisible(slider); }
 master.setTextValueSuffix(" gain"); tempo.setTextValueSuffix(" BPM"); tempo.setEnabled(standalone);
 masterAttachment=std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(p.state,"master",master);
 tempoAttachment=std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(p.state,"tempo",tempo);
 enableAttachment=std::make_unique<juce::AudioProcessorValueTreeState::ButtonAttachment>(p.state,"sequencer",enable);
 for(int c=0;c<16;++c) {
  auto& pad=pads[static_cast<size_t>(c)]; pad.setButtonText(juce::String(c+1)+"  "+aixel::names[static_cast<size_t>(c)]); pad.onClick=[this,c] { drums.triggerPad(c); }; addAndMakeVisible(pad);
  for(int s=0;s<16;++s) { auto& b=grid[static_cast<size_t>(c*16+s)]; b.setButtonText(juce::String(s+1)); b.onClick=[this,c,s] { drums.toggleStep(c,s); }; b.setColour(juce::TextButton::buttonOnColourId,juce::Colour(0xffd88c16)); addAndMakeVisible(b); }
 }
 setSize(1050,680); startTimerHz(30);
}
void DrumEditor::paint(juce::Graphics& g) { g.fillAll(juce::Colour(0xff17191d)); }
void DrumEditor::resized() {
 title.setBounds(18,8,900,40); transport.setBounds(18,55,155,30); enable.setBounds(185,55,160,30); tempo.setBounds(350,55,220,30); master.setBounds(595,55,260,30); status.setBounds(18,91,990,26);
 for(int c=0;c<16;++c) { pads[static_cast<size_t>(c)].setBounds(18,124+c*33,160,29); for(int s=0;s<16;++s) grid[static_cast<size_t>(c*16+s)].setBounds(188+s*52,124+c*33,47,29); }
}
void DrumEditor::timerCallback() {
 const int active=drums.currentStep.load();
 status.setText("KIT  >  SEQUENCER  >  SOUND  >  MIXER  >  FX  >  SONG     |     "+juce::String(drums.displayedTempo.load(),1)+" BPM     |     Peak "+juce::String(drums.peak.load(),3),juce::dontSendNotification);
 for(int c=0;c<16;++c) for(int s=0;s<16;++s) { auto& b=grid[static_cast<size_t>(c*16+s)]; b.setToggleState(drums.stepOn(c,s),juce::dontSendNotification); b.setColour(juce::TextButton::buttonColourId,s==active?juce::Colour(0xff536172):juce::Colour(0xff2b2f35)); }
}
