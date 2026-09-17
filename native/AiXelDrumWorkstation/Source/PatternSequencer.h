#pragma once
#include <cmath>
#include <cstdint>
namespace aixel {
// PPQ-based sixteenths; block partition independent, supports seeks and loops.
class PatternSequencer {
 double previous=0;
 bool started=false;
public:
 void reset() { previous=0; started=false; }
 int tick(double ppq,double increment) {
  const double position=ppq*4.0;
  const auto step=static_cast<int64_t>(std::floor(position+1e-8));
  const auto before=static_cast<int64_t>(std::floor(previous+1e-8));
  const bool discontinuity=!started || std::abs(position-previous-increment*4)>1e-5;
  const bool boundary=std::abs(position-std::round(position))<1e-7;
  const bool fire=discontinuity ? boundary : step!=before;
  previous=position; started=true;
  return fire ? static_cast<int>((step%16+16)%16) : -1;
 }
};
}
