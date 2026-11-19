import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Image, Platform} from 'react-native';
import {apiClient} from '@/lib/api/client';
import {BmnPhotoImage} from '../BmnPhotoImage';

let mockToken:string|null='42|dummy-photo-credential';
jest.mock('@/features/auth/AuthProvider',()=>({useOptionalAuth:()=>({token:mockToken})}));
jest.mock('@/lib/api/client',()=>({apiClient:{defaults:{baseURL:'https://api.example.test/api'},get:jest.fn()}}));
jest.mock('react-native',()=>({Image:'Image',Platform:{OS:'web'}}));
const create=jest.fn(),revoke=jest.fn();
const keys=['createObjectURL','revokeObjectURL'] as const;
const descriptors=keys.map(key=>Object.getOwnPropertyDescriptor(URL,key));
const photo='/api/bmn/assets/17/photo/depan/view?v=9';
let tree:renderer.ReactTestRenderer|undefined;
const source=()=>tree!.root.findByType(Image).props.source;
const view=(uri=photo,onError?:React.ComponentProps<typeof BmnPhotoImage>['onError'])=><BmnPhotoImage source={{uri}} style={{width:120,height:80,borderRadius:12}} resizeMode="cover" accessibilityLabel="Foto aset dummy" onError={onError}/>;
beforeEach(()=>{
 mockToken='42|dummy-photo-credential';jest.clearAllMocks();
 (apiClient.get as jest.Mock).mockReset();
 create.mockReset().mockReturnValue('blob:dummy-photo');
 Object.defineProperty(URL,'createObjectURL',{value:create,configurable:true,writable:true});
 Object.defineProperty(URL,'revokeObjectURL',{value:revoke,configurable:true,writable:true});
});
afterEach(()=>{
 if(tree)act(()=>tree!.unmount());tree=undefined;
 keys.forEach((key,i)=>{const descriptor=descriptors[i];if(descriptor)Object.defineProperty(URL,key,descriptor);else Reflect.deleteProperty(URL,key);});
 jest.restoreAllMocks();
});

it('loads web photos through the API without credentials in the URL or image attributes',async()=>{
 (apiClient.get as jest.Mock).mockResolvedValue({data:{type:'image/png'}});
 await act(async()=>{tree=renderer.create(view(photo+'&token=old-secret&ToKeN=another-secret'));});
 expect(apiClient.get).toHaveBeenCalledWith('https://api.example.test'+photo,{responseType:'blob'});
 expect(source()).toEqual({uri:'blob:dummy-photo'});
 const image=tree!.root.findByType(Image);
 expect(image.props.style).toEqual({width:120,height:80,borderRadius:12});
 expect(image.props.resizeMode).toBe('cover');expect(image.props.accessibilityLabel).toBe('Foto aset dummy');
 act(()=>tree!.unmount());tree=undefined;
 expect(revoke).toHaveBeenCalledWith('blob:dummy-photo');
});

it('uses Authorization headers for native photos while keeping public/external images credential-free',()=>{
 jest.replaceProperty(Platform,'OS','android');
 act(()=>{tree=renderer.create(view(photo+'&token=old-secret'));});
 expect(source()).toEqual({uri:'https://api.example.test'+photo,headers:{Authorization:'Bearer 42|dummy-photo-credential'}});
 const legacy=photo.replace('/view?', '/download/?')+'&%74oken=old-secret';
 act(()=>tree!.update(view(legacy)));
 expect(source()).toEqual({uri:'https://api.example.test'+photo.replace('/view?', '/download/?'),headers:{Authorization:'Bearer 42|dummy-photo-credential'}});
 for(const uri of ['https://external.example.test'+photo,'https://api.example.test@external.example.test'+photo,'https://api.example.test/api/unrelated','data:image/png;base64,AA==']){
  act(()=>tree!.update(view(uri)));
  expect(source()).toEqual({uri});
 }
 expect(apiClient.get).not.toHaveBeenCalled();
});

it('preserves the image error callback on forbidden reads and rejects non-image blobs',async()=>{
 const failed=jest.fn();
 (apiClient.get as jest.Mock).mockRejectedValueOnce({status:403});
 await act(async()=>{tree=renderer.create(view(photo,failed));});
 expect(failed).toHaveBeenCalledTimes(1);expect(source()).toBeUndefined();
 (apiClient.get as jest.Mock).mockResolvedValueOnce({data:{type:'text/html'}});
 await act(async()=>tree!.update(view(photo.replace('/17/','/18/'),failed)));
 expect(failed).toHaveBeenCalledTimes(2);expect(create).not.toHaveBeenCalled();
});

it('ignores obsolete responses and cleans blobs when the photo, session or mounted view changes',async()=>{
 let finishOld!:(value:unknown)=>void;
 (apiClient.get as jest.Mock).mockImplementationOnce(()=>new Promise(resolve=>{finishOld=resolve;}))
  .mockResolvedValue({data:{type:'image/jpeg'}});
 await act(async()=>{tree=renderer.create(view(photo));});
 create.mockReturnValueOnce('blob:latest').mockReturnValueOnce('blob:new-session');
 const latest=photo.replace('/17/','/18/');
 await act(async()=>tree!.update(view(latest)));
 await act(async()=>finishOld({data:{type:'image/png'}}));
 expect(create).toHaveBeenCalledTimes(1);expect(source()).toEqual({uri:'blob:latest'});
 mockToken='43|dummy-next-session';
 act(()=>tree!.update(view(latest)));
 expect(source()).toBeUndefined();
 await act(async()=>{});
 expect(revoke).toHaveBeenCalledWith('blob:latest');expect(source()).toEqual({uri:'blob:new-session'});
 act(()=>tree!.unmount());tree=undefined;
 expect(revoke).toHaveBeenCalledWith('blob:new-session');
});

it('does not create a blob or report errors for a request completed after unmount',async()=>{
 let finish!:(value:unknown)=>void;
 const failed=jest.fn();
 (apiClient.get as jest.Mock).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 await act(async()=>{tree=renderer.create(view(photo,failed));});
 act(()=>tree!.unmount());tree=undefined;
 await act(async()=>finish({data:{type:'image/png'}}));
 expect(create).not.toHaveBeenCalled();expect(failed).not.toHaveBeenCalled();
});
