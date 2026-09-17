cmake_minimum_required(VERSION 3.22)
project(AiXelDrumWorkstation VERSION 0.1.0 LANGUAGES C CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
include(FetchContent)
if(JUCE_PATH)
  add_subdirectory("${JUCE_PATH}" JUCE)
else()
  FetchContent_Declare(JUCE GIT_REPOSITORY https://github.com/juce-framework/JUCE.git GIT_TAG 8.0.12 GIT_SHALLOW TRUE)
  FetchContent_MakeAvailable(JUCE)
endif()
juce_add_plugin(AiXelDrumWorkstation
 COMPANY_NAME "AiXel Studio" BUNDLE_ID "studio.aixel.drumworkstation"
 PLUGIN_MANUFACTURER_CODE Axlf PLUGIN_CODE Axdr
 FORMATS VST3 Standalone PRODUCT_NAME "AiXel Drum Workstation"
 IS_SYNTH TRUE NEEDS_MIDI_INPUT TRUE NEEDS_MIDI_OUTPUT FALSE
 IS_MIDI_EFFECT FALSE COPY_PLUGIN_AFTER_BUILD FALSE
 VST3_CATEGORIES Instrument Drum)
target_sources(AiXelDrumWorkstation PRIVATE Source/PluginProcessor.cpp Source/PluginEditor.cpp)
target_compile_definitions(AiXelDrumWorkstation PUBLIC JUCE_WEB_BROWSER=0 JUCE_USE_CURL=0 JUCE_VST3_CAN_REPLACE_VST2=0)
target_link_libraries(AiXelDrumWorkstation PRIVATE juce::juce_audio_utils PUBLIC juce::juce_recommended_config_flags juce::juce_recommended_warning_flags)
option(AIXEL_BUILD_TESTS "Build processor integration tests" ON)
if(AIXEL_BUILD_TESTS)
 enable_testing()
 add_executable(AiXelTests)
 target_sources(AiXelTests PRIVATE Tests/ProcessorTests.cpp)
 target_include_directories(AiXelTests PRIVATE Source)
 target_link_libraries(AiXelTests PRIVATE AiXelDrumWorkstation juce::juce_audio_utils)
 add_test(NAME processor COMMAND AiXelTests)
endif()
