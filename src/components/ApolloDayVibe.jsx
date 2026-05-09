import React from 'react';

const ApolloDayVibe = () => (
  <div className="apollo-daylight-bg" aria-hidden="true">
    <div className="apollo-sun-wrap">
      <span className="apollo-sun-glow" />
      <span className="apollo-sun-core" />
      <span className="apollo-sun-ray apollo-sun-ray--one" />
      <span className="apollo-sun-ray apollo-sun-ray--two" />
      <span className="apollo-sun-ray apollo-sun-ray--three" />
    </div>

    <div className="apollo-clouds">
      <span className="apollo-cloud apollo-cloud--one" />
      <span className="apollo-cloud apollo-cloud--two" />
      <span className="apollo-cloud apollo-cloud--three" />
    </div>

    <div className="apollo-haze apollo-haze--one" />
    <div className="apollo-haze apollo-haze--two" />
    <div className="apollo-horizon" />
  </div>
);

export default ApolloDayVibe;
