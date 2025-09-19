import { performScan } from '../index';

describe('@alex8734/vision-camera-screen-detector', () => {
  it('should export performScan function', () => {
    expect(performScan).toBeDefined();
    expect(typeof performScan).toBe('function');
  });
});
