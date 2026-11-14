import { expect,it } from 'vitest';

import { loginDestination } from '../mobile-navigation';
it('keeps valid mobile deep links and rejects external or authentication redirects',()=>{
 expect(loginDestination('/m/orders?activityId=a','/home')).toBe('/m/orders?activityId=a');
 for(const value of ['https://evil.example/','//evil.example/','/auth/login','/m\\\\evil.example/','/m/\nredirect',null,['/m/orders']])expect(loginDestination(value,'/home')).toBe('/home');
});
